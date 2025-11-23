#!/usr/bin/env python3
"""
Mock prediction script for SmartFarm TZ crop health diagnosis
This script simulates AI predictions until the full ML packages are installed
"""

import sys
import json
import random
import os

def main():
    if len(sys.argv) != 2:
        result = {
            "success": False,
            "error": "Usage: python predict.py <image_path>"
        }
        print(json.dumps(result))
        return
    
    image_path = sys.argv[1]
    
    # Check if image file exists
    if not os.path.exists(image_path):
        result = {
            "success": False,
            "error": f"Image file not found: {image_path}"
        }
        print(json.dumps(result))
        return
    
    # Mock diseases for demonstration
    diseases = [
        "Tomato___Early_blight",
        "Tomato___Late_blight", 
        "Tomato___Bacterial_spot",
        "Tomato___healthy",
        "Potato___Early_blight",
        "Potato___healthy",
        "Corn_(maize)___Common_rust_",
        "Corn_(maize)___healthy",
        "Apple___Apple_scab",
        "Apple___healthy"
    ]
    
    # Simulate prediction
    predicted_class = random.choice(diseases)
    confidence = round(random.uniform(0.75, 0.98), 3)
    
    # Generate top predictions
    top_predictions = []
    for i in range(3):
        disease = random.choice(diseases)
        conf = round(random.uniform(0.1, 0.9), 3)
        top_predictions.append({
            "class": disease,
            "confidence": conf
        })
    
    # Sort by confidence
    top_predictions.sort(key=lambda x: x["confidence"], reverse=True)
    
    result = {
        "success": True,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "top_predictions": top_predictions,
        "message": "Mock prediction successful (using temporary mock until ML packages are installed)"
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
