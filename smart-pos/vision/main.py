import cv2
from pyzbar.pyzbar import decode
from ultralytics import YOLO
import time
import json
import uuid
import os
import requests
from datetime import datetime
import threading
from concurrent.futures import ThreadPoolExecutor
import qrcode

# Hardcoded for sharing purposes (Note: Use .env in production)
DATABASE_URL = "https://income-tracker-f37cf-default-rtdb.firebaseio.com"

def get_hardware_id():
    node = uuid.getnode()
    return f"CAM_{node}"

SCANNER_ID = get_hardware_id()

print("\n" + "="*50)
print(f"🚀 SMART POS VISION NODE STARTING")
print(f"🆔 CAMERA ID: {SCANNER_ID}")
print("Scan the QR code below in the mobile app to pair:\n")
qr = qrcode.QRCode(version=1, box_size=1, border=1)
qr.add_data(SCANNER_ID)
qr.make(fit=True)
qr.print_ascii(invert=True)
print("="*50 + "\n")

print(f"Loading YOLOv8 model for {SCANNER_ID}...")
model = YOLO('yolov8n.pt') 
print("Model loaded.")

executor = ThreadPoolExecutor(max_workers=4)

def push_to_db_async(item):
    try:
        item['time'] = datetime.fromtimestamp(item['timestamp']).strftime('%I:%M %p')
        item['scanner_id'] = SCANNER_ID
        
        # We use a direct POST request to bypass library permission issues
        url = f"{DATABASE_URL}/cameras/{SCANNER_ID}/scans.json"
        response = requests.post(url, json=item)
        
        if response.status_code == 200:
            print(f"✅ Successfully sent to App: {item['name']}")
            os.system("paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &")
        else:
            print(f"❌ Failed to send: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"⚠️ Network Error: {e}")

def push_to_db(item):
    executor.submit(push_to_db_async, item)

DEBOUNCE_TIME = 1.2 # Faster scanning for multiple items
seen_items = {}
CONFIDENCE_THRESHOLD = 0.65
REQUIRED_CONSECUTIVE_FRAMES = 5
frame_buffers = {}

VENDOR_CONFIGS = {
    "food_truck": {
        "classes": ['sandwich', 'hot dog', 'pizza', 'cup', 'bottle', 'bowl', 'fork', 'knife', 'spoon'],
        "prices": {'sandwich': 80, 'hot dog': 60, 'pizza': 150, 'cup': 40, 'bottle': 20, 'bowl': 100, 'fork': 5, 'knife': 5, 'spoon': 5}
    },
    "produce_stand": {
        "classes": ['apple', 'orange', 'banana', 'broccoli', 'carrot', 'bottle', 'bowl', 'potted plant'],
        "prices": {'apple': 30, 'orange': 40, 'banana': 15, 'broccoli': 50, 'carrot': 25, 'bottle': 20, 'bowl': 60, 'potted plant': 120}
    },
    "bakery": {
        "classes": ['donut', 'cake', 'sandwich', 'cup', 'bottle', 'bowl', 'fork', 'knife', 'spoon'],
        "prices": {'donut': 50, 'cake': 350, 'sandwich': 120, 'cup': 80, 'bottle': 30, 'bowl': 90, 'fork': 5, 'knife': 5, 'spoon': 5}
    },
    "kirana_store": {
        "classes": ['bottle', 'cup', 'bowl', 'banana', 'apple', 'orange', 'carrot', 'broccoli', 'spoon', 'fork', 'knife', 'scissors', 'toothbrush', 'book', 'vase'],
        "prices": {'bottle': 20, 'cup': 30, 'bowl': 45, 'banana': 12, 'apple': 30, 'orange': 35, 'carrot': 20, 'broccoli': 40, 'spoon': 10, 'fork': 10, 'knife': 15, 'scissors': 60, 'toothbrush': 45, 'book': 150, 'vase': 200}
    },
    "cafeteria": {
        "classes": ['cup', 'bottle', 'wine glass', 'bowl', 'sandwich', 'pizza', 'donut', 'cake', 'hot dog', 'fork', 'knife', 'spoon', 'banana', 'apple', 'orange'],
        "prices": {'cup': 60, 'bottle': 30, 'wine glass': 120, 'bowl': 90, 'sandwich': 100, 'pizza': 180, 'donut': 60, 'cake': 250, 'hot dog': 80, 'fork': 5, 'knife': 5, 'spoon': 5, 'banana': 20, 'apple': 40, 'orange': 45}
    }
}

active_vendor = "food_truck"
active_classes = VENDOR_CONFIGS[active_vendor]["classes"]
active_prices = VENDOR_CONFIGS[active_vendor]["prices"]
custom_prices = {}

def fetch_vendor_config():
    global active_vendor, active_classes, active_prices, custom_prices
    while True:
        try:
            # Fetch vendor type
            resp = requests.get(f"{DATABASE_URL}/cameras/{SCANNER_ID}/settings/vendor_type.json")
            if resp.status_code == 200 and resp.text != 'null':
                new_vendor = resp.json()
                if new_vendor in VENDOR_CONFIGS and new_vendor != active_vendor:
                    print(f"\n🔄 Switching AI Brain to {new_vendor.upper()} mode!\n")
                    active_vendor = new_vendor
                    active_classes = VENDOR_CONFIGS[new_vendor]["classes"]
                    active_prices = VENDOR_CONFIGS[new_vendor]["prices"]
            
            # Fetch custom prices
            resp_prices = requests.get(f"{DATABASE_URL}/cameras/{SCANNER_ID}/settings/prices.json")
            if resp_prices.status_code == 200 and resp_prices.text != 'null':
                custom_prices = resp_prices.json()
                
        except: pass
        time.sleep(3.0)

threading.Thread(target=fetch_vendor_config, daemon=True).start()

def get_item_price(item_name):
    # Check custom prices first, then fallback to vendor defaults
    name_lower = item_name.lower()
    if name_lower in custom_prices:
        return custom_prices[name_lower]
    return active_prices.get(name_lower, 20)

def send_heartbeat():
    while True:
        try: requests.put(f"{DATABASE_URL}/cameras/{SCANNER_ID}/heartbeat.json", json=int(time.time() * 1000))
        except: pass
        time.sleep(5)

threading.Thread(target=send_heartbeat, daemon=True).start()

def process_frame(frame):
    current_time = time.time()
    detected_items = []
    current_seen_this_frame = set()
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    barcodes = decode(gray_frame)
    for barcode in barcodes:
        barcode_data = barcode.data.decode('utf-8')
        if barcode_data not in seen_items or (current_time - seen_items[barcode_data]) > DEBOUNCE_TIME:
            seen_items[barcode_data] = current_time
            item = {"id": str(uuid.uuid4()), "name": f"Item {barcode_data}", "price": 50, "timestamp": current_time, "type": "barcode", "data": barcode_data}
            detected_items.append(item)
            (x, y, w, h) = barcode.rect
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, barcode_data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
    results = model(frame, stream=True, verbose=False)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            conf = float(box.conf[0])
            if conf < CONFIDENCE_THRESHOLD: continue
            cls_id = int(box.cls[0]); class_name = model.names[cls_id]
            if class_name in active_classes:
                current_seen_this_frame.add(class_name)
                frame_buffers[class_name] = frame_buffers.get(class_name, 0) + 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                if frame_buffers[class_name] >= REQUIRED_CONSECUTIVE_FRAMES:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"{class_name.capitalize()} ({conf:.2f})", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    if class_name not in seen_items or (current_time - seen_items[class_name]) > DEBOUNCE_TIME:
                        seen_items[class_name] = current_time
                        item = {"id": str(uuid.uuid4()), "name": f"{class_name.capitalize()}", "price": get_item_price(class_name), "confidence": round(conf, 2), "timestamp": current_time, "type": "vision", "data": class_name}
                        detected_items.append(item)
                else:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 2)
                    cv2.putText(frame, f"Scanning... {frame_buffers[class_name]}/{REQUIRED_CONSECUTIVE_FRAMES}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
    for k in list(frame_buffers.keys()):
        if k not in current_seen_this_frame: frame_buffers[k] = 0
    return frame, detected_items

def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened(): print("Error: Could not open webcam."); return
    print("Webcam started. Press 'q' to quit.")
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        processed_frame, new_items = process_frame(frame)
        for item in new_items: push_to_db(item)
        cv2.imshow("Smart POS - Vision Pipeline", processed_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break
    cap.release(); cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
