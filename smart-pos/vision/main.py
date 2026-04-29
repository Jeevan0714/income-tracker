import cv2
from pyzbar.pyzbar import decode
from ultralytics import YOLO
import time
import json
import uuid
import os

# To use Firebase later, uncomment and set up the admin SDK
# import firebase_admin
# from firebase_admin import credentials, db

print("Loading YOLOv8 model...")
model = YOLO('yolov8n.pt') # Using pretrained nano model for speed
print("Model loaded.")

# Placeholder for firebase push
def push_to_db(item):
    print(f"[FIREBASE PUSH] {json.dumps(item)}")
    # db.reference('/scans').push(item)

# Debounce settings
# We don't want to register the same item multiple times per second
DEBOUNCE_TIME = 3.0 # seconds
seen_items = {}

def process_frame(frame):
    current_time = time.time()
    detected_items = []
    
    # 1. Barcode scanning
    barcodes = decode(frame)
    for barcode in barcodes:
        barcode_data = barcode.data.decode('utf-8')
        barcode_type = barcode.type
        
        # Check debounce
        if barcode_data not in seen_items or (current_time - seen_items[barcode_data]) > DEBOUNCE_TIME:
            seen_items[barcode_data] = current_time
            item = {
                "id": str(uuid.uuid4()),
                "name": f"Item {barcode_data}",
                "price": 50, # Mock price
                "timestamp": current_time,
                "type": "barcode",
                "data": barcode_data
            }
            detected_items.append(item)
            
            # Draw on frame
            (x, y, w, h) = barcode.rect
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, barcode_data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
    # 2. YOLO Object Detection
    # Run inference only on every frame
    results = model(frame, stream=True, verbose=False)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Class ID
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            
            # Filter for specific objects (e.g. cup, bottle, sandwich, hot dog, pizza, donut, cake)
            allowed_classes = ['cup', 'bottle', 'sandwich', 'hot dog', 'pizza', 'donut', 'cake', 'bowl', 'apple', 'orange']
            
            if class_name in allowed_classes:
                # Check debounce
                if class_name not in seen_items or (current_time - seen_items[class_name]) > DEBOUNCE_TIME:
                    seen_items[class_name] = current_time
                    item = {
                        "id": str(uuid.uuid4()),
                        "name": f"{class_name.capitalize()}",
                        "price": 20, # Mock price
                        "timestamp": current_time,
                        "type": "vision",
                        "data": class_name
                    }
                    detected_items.append(item)
                    
                # Draw on frame
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
                cv2.putText(frame, class_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
                
    return frame, detected_items

def main():
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
        
    print("Webcam started. Press 'q' to quit.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Process the frame
        processed_frame, new_items = process_frame(frame)
        
        # Push any new items to database
        for item in new_items:
            push_to_db(item)
            
        # Show the frame
        cv2.imshow("Smart POS - Vision Pipeline", processed_frame)
        
        # Quit on 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
