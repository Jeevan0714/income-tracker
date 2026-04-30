# Smart POS - AI Powered Vendor Management

A production-level Point of Sale (POS) system that combines computer vision (YOLOv8), barcode scanning, and a mobile dashboard to help vendors track inventory and sales in real-time.

## 🚀 Key Features

*   **AI Vision Pipeline:** Real-time object detection using YOLOv8, optimized for multiple vendor types (Food Truck, Produce Stand, etc.).
*   **Atomic Inventory:** Secure, race-condition-free inventory deductions using Firebase Transactions.
*   **Real-time Analytics:** Visualized sales data, popular items, and revenue trends directly in the mobile app.
*   **Non-Blocking Architecture:** Vision detection and database operations run on separate threads for maximum performance.
*   **Camera Heartbeat:** Mobile app detects if the vision node is online/offline.
*   **Multi-Scanner Support:** Distinct `SCANNER_ID` tracking allows multiple cameras to work with a single dashboard without conflicts.
*   **Secure Config:** Environment variable support for Firebase credentials and system settings.

## 🛠️ Tech Stack

*   **Vision Backend:** Python, OpenCV, Ultralytics (YOLOv8), PyZbar, Firebase Admin SDK.
*   **Mobile App:** React Native (Expo), TypeScript, Firebase, React Native Chart Kit.
*   **Database:** Firebase Realtime Database.

## 📦 Setup Instructions

### Vision Backend
1.  Navigate to `smart-pos/vision/`.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Create a `.env` file with your `DATABASE_URL` and `SCANNER_ID`.
4.  Run: `python main.py`.

### Mobile App
1.  Navigate to `smart-pos/mobile/`.
2.  Install dependencies: `npm install`.
3.  Create a `.env` file with your `EXPO_PUBLIC_FIREBASE_*` credentials.
4.  Start the app: `npx expo start`.

## 🔒 Security
*   Sensitive credentials are moved to `.env` files.
*   Atomic updates prevent data corruption during high-frequency scans.
*   Firebase Admin SDK allows for secure, server-side database access.
