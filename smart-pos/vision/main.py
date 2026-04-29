import cv2
from pyzbar.pyzbar import decode
from ultralytics import YOLO
import time
import json
import uuid
import os
import requests
from datetime import datetime

print("Loading YOLOv8 model...")
model = YOLO('yolov8n.pt') # Using pretrained nano model for speed
print("Model loaded.")

DATABASE_URL = "https://income-tracker-f37cf-default-rtdb.firebaseio.com"

# Using REST API to push to Firebase Realtime Database
def push_to_db(item):
    print(f"[FIREBASE PUSH] {json.dumps(item)}")
    # Play a reliable system 'ding' sound on Ubuntu in the background
    os.system("paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &")
    try:
        # Convert timestamp to human readable for mobile app display
        item['time'] = datetime.fromtimestamp(item['timestamp']).strftime('%I:%M %p')
        response = requests.post(f"{DATABASE_URL}/scans.json", json=item)
        if response.status_code != 200:
            print("Failed to push scan:", response.text)
            
        # Inventory Deduct Logic
        # We use the item name as the key in the inventory database
        inv_key = item['name'].replace(" ", "_").replace(".", "").replace("/", "")
        inv_resp = requests.get(f"{DATABASE_URL}/inventory/{inv_key}.json")
        if inv_resp.status_code == 200 and inv_resp.text != 'null':
            current_stock = int(inv_resp.text)
            new_stock = current_stock - 1
            requests.put(f"{DATABASE_URL}/inventory/{inv_key}.json", json=new_stock)
            print(f"📉 Deducted inventory for {inv_key}: {new_stock} left")
            
    except Exception as e:
        print("Network error:", e)

# Debounce & Robustness settings
DEBOUNCE_TIME = 3.0 # seconds
seen_items = {} # Prevents duplicate pushes

CONFIDENCE_THRESHOLD = 0.65
REQUIRED_CONSECUTIVE_FRAMES = 5
frame_buffers = {} # Tracks consecutive frames seen

def process_frame(frame):
    current_time = time.time()
    detected_items = []
    current_seen_this_frame = set()
    
    # 1. Barcode scanning (Enhanced with Grayscale)
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    barcodes = decode(gray_frame)
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
    results = model(frame, stream=True, verbose=False)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            conf = float(box.conf[0])
            if conf < CONFIDENCE_THRESHOLD:
                continue # Ignore low confidence guesses
                
            # Class ID
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            
            # Filter for specific objects
            allowed_classes = ['cup', 'bottle', 'sandwich', 'hot dog', 'pizza', 'donut', 'cake', 'bowl', 'apple', 'orange']
            
            if class_name in allowed_classes:
                current_seen_this_frame.add(class_name)
                frame_buffers[class_name] = frame_buffers.get(class_name, 0) + 1
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                if frame_buffers[class_name] >= REQUIRED_CONSECUTIVE_FRAMES:
                    # Confirmed scan (Draw Green)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"{class_name.capitalize()} ({conf:.2f})", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
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
                else:
                    # Buffering scan (Draw Orange)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 2)
                    cv2.putText(frame, f"Scanning... {frame_buffers[class_name]}/{REQUIRED_CONSECUTIVE_FRAMES}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)

    # Reset buffer for items that disappeared in this frame (Anti-Flicker)
    for k in list(frame_buffers.keys()):
        if k not in current_seen_this_frame:
            frame_buffers[k] = 0
            
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
