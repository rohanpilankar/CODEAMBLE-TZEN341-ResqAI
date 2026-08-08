import json
import os

notebook = {
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# 🚁 ResQAI - Advanced YOLO Disaster Detection Engine (Image & Video Analysis)\n",
    "\n",
    "This production-grade notebook demonstrates loading a state-of-the-art YOLO model (`yolov8n.pt` / `yolov8x.pt`), performing real-time object and person detection on **both static images and dynamic video streams**, extracting spatial bounding boxes, tracking disaster victims/vehicles, and exporting structured JSON analytics & annotated media outputs."
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# Install core dependencies\n",
    "!pip install ultralytics opencv-python matplotlib numpy"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import os\n",
    "import json\n",
    "import cv2\n",
    "import numpy as np\n",
    "import matplotlib.pyplot as plt\n",
    "from ultralytics import YOLO\n",
    "\n",
    "# Ensure output directories exist\n",
    "output_dir = \"../data/processed/yolo_outputs\"\n",
    "os.makedirs(output_dir, exist_ok=True)\n",
    "print(f\"[SETUP] Outputs will be stored in: {os.path.abspath(output_dir)}\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 1. Initialize YOLO Model\n",
    "# Load lightweight YOLOv8 model (or upgrade to 'yolov8s.pt' / 'yolov8x.pt' for maximum precision)\n",
    "model_path = \"yolov8n.pt\"\n",
    "model = YOLO(model_path)\n",
    "print(f\"[MODEL] Loaded YOLO Model successfully: {model_path}\")\n",
    "print(f\"[MODEL] Detectable classes: {len(model.names)} items (person, car, bus, boat, etc.)\")"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 2. Image Detection Pipeline Function\n",
    "def detect_image(image_path, conf_threshold=0.25):\n",
    "    if not os.path.exists(image_path):\n",
    "        print(f\"[ERROR] Image file not found: {image_path}\")\n",
    "        return None\n",
    "        \n",
    "    print(f\"[IMAGE INFERENCE] Running detection on: {image_path}\")\n",
    "    results = model(image_path, conf=conf_threshold)[0]\n",
    "    \n",
    "    detections = []\n",
    "    person_count = 0\n",
    "    vehicle_count = 0\n",
    "    \n",
    "    for box in results.boxes:\n",
    "        cls_id = int(box.cls[0])\n",
    "        class_name = model.names[cls_id]\n",
    "        conf = float(box.conf[0])\n",
    "        xyxy = box.xyxy[0].tolist()\n",
    "        \n",
    "        if class_name == 'person':\n",
    "            person_count += 1\n",
    "        elif class_name in ['car', 'truck', 'bus', 'boat']:\n",
    "            vehicle_count += 1\n",
    "            \n",
    "        detections.append({\n",
    "            \"class\": class_name,\n",
    "            \"confidence\": round(conf, 4),\n",
    "            \"bbox_xyxy\": [round(x, 2) for x in xyxy]\n",
    "        })\n",
    "        \n",
    "    base_name = os.path.splitext(os.path.basename(image_path))[0]\n",
    "    \n",
    "    # Save annotated image\n",
    "    annotated_img = results.plot()\n",
    "    annotated_save_path = os.path.join(output_dir, f\"annotated_{base_name}.jpg\")\n",
    "    cv2.imwrite(annotated_save_path, annotated_img)\n",
    "    \n",
    "    # Save JSON metrics\n",
    "    metrics = {\n",
    "        \"image\": os.path.basename(image_path),\n",
    "        \"total_objects\": len(detections),\n",
    "        \"people_detected\": person_count,\n",
    "        \"vehicles_detected\": vehicle_count,\n",
    "        \"detections\": detections\n",
    "    }\n",
    "    json_save_path = os.path.join(output_dir, f\"detection_{base_name}.json\")\n",
    "    with open(json_save_path, \"w\") as f:\n",
    "        json.dump(metrics, f, indent=4)\n",
    "        \n",
    "    print(f\"[SUCCESS] Found {person_count} people, {len(detections)} total objects.\")\n",
    "    print(f\"[SAVED] Image: {annotated_save_path}\")\n",
    "    print(f\"[SAVED] JSON: {json_save_path}\")\n",
    "    \n",
    "    # Render visualization\n",
    "    plt.figure(figsize=(12, 8))\n",
    "    plt.imshow(cv2.cvtColor(annotated_img, cv2.COLOR_BGR2RGB))\n",
    "    plt.title(f\"YOLO Detection: {person_count} People | {len(detections)} Objects\")\n",
    "    plt.axis('off')\n",
    "    plt.show()\n",
    "    return metrics"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 3. Video Stream & File Detection Pipeline Function\n",
    "def detect_video(video_path, output_filename=\"annotated_video.mp4\", conf_threshold=0.25, sample_rate=2):\n",
    "    if not os.path.exists(video_path):\n",
    "        print(f\"[ERROR] Video file not found: {video_path}\")\n",
    "        return None\n",
    "        \n",
    "    cap = cv2.VideoCapture(video_path)\n",
    "    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))\n",
    "    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))\n",
    "    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 24\n",
    "    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))\n",
    "    \n",
    "    print(f\"[VIDEO INFERENCE] Processing video: {video_path} ({width}x{height} @ {fps}fps, total {total_frames} frames)\")\n",
    "    \n",
    "    save_video_path = os.path.join(output_dir, output_filename)\n",
    "    fourcc = cv2.VideoWriter_fourcc(*'mp4v')\n",
    "    out = cv2.VideoWriter(save_video_path, fourcc, fps, (width, height))\n",
    "    \n",
    "    frame_count = 0\n",
    "    video_analytics = []\n",
    "    max_people_in_frame = 0\n",
    "    \n",
    "    while cap.isOpened():\n",
    "        ret, frame = cap.read()\n",
    "        if not ret:\n",
    "            break\n",
    "            \n",
    "        frame_count += 1\n",
    "        \n",
    "        # Process frame based on sample_rate for speed optimization\n",
    "        if frame_count % sample_rate == 0 or frame_count == 1:\n",
    "            results = model(frame, conf=conf_threshold, verbose=False)[0]\n",
    "            annotated_frame = results.plot()\n",
    "            \n",
    "            people_in_frame = sum(1 for box in results.boxes if model.names[int(box.cls[0])] == 'person')\n",
    "            max_people_in_frame = max(max_people_in_frame, people_in_frame)\n",
    "            \n",
    "            video_analytics.append({\n",
    "                \"frame\": frame_count,\n",
    "                \"people_count\": people_in_frame,\n",
    "                \"total_objects\": len(results.boxes)\n",
    "            })\n",
    "        else:\n",
    "            annotated_frame = frame\n",
    "            \n",
    "        out.write(annotated_frame)\n",
    "        \n",
    "    cap.release()\n",
    "    out.release()\n",
    "    \n",
    "    json_save_path = os.path.join(output_dir, f\"{os.path.splitext(output_filename)[0]}_analytics.json\")\n",
    "    summary = {\n",
    "        \"video_file\": os.path.basename(video_path),\n",
    "        \"processed_frames\": frame_count,\n",
    "        \"max_people_detected_simultaneously\": max_people_in_frame,\n",
    "        \"output_video\": save_video_path,\n",
    "        \"frame_metrics\": video_analytics\n",
    "    }\n",
    "    with open(json_save_path, \"w\") as f:\n",
    "        json.dump(summary, f, indent=4)\n",
    "        \n",
    "    print(f\"[SUCCESS] Video processing completed!\")\n",
    "    print(f\"[SAVED] Output Video: {save_video_path}\")\n",
    "    print(f\"[SAVED] Analytics JSON: {json_save_path}\")\n",
    "    return summary"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "# 4. Run Sample Detection (Replace with your actual image/video paths)\n",
    "test_image_path = r\"C:\\Users\\HP\\OneDrive\\Pictures\\Camera Roll\\x.jpeg\"\n",
    "if os.path.exists(test_image_path):\n",
    "    detect_image(test_image_path)\n",
    "else:\n",
    "    print(f\"[NOTICE] Set 'test_image_path' to run test image detection.\")"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "name": "python",
   "version": "3.10.0"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}

with open("notebooks/05_yolo_person_detection.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print("[COMPLETE] High-performance YOLO Image & Video notebook updated successfully!")
