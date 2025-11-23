#!/usr/bin/env python3
"""
Mock plant identification script for SmartFarm TZ
This script simulates plant identification until the full ML packages are installed
"""

import sys
import json
import random
import os

def main():
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "Usage: python identify_plant.py <image_path> [plant_name_for_learning]"
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
    
    # Check if this is a learning request
    if len(sys.argv) == 3:
        plant_name = sys.argv[2]
        result = {
            "success": True,
            "message": f"Successfully learned new plant: {plant_name}",
            "plant_name": plant_name.strip().lower().replace(' ', '_'),
            "stored_path": f"learned_plants/{plant_name}_mock.jpg"
        }
        print(json.dumps(result))
        return
    
    # Mock plants for demonstration
    plants = [
        {
            "plant_name": "Maize",
            "plant_type": "Corn",
            "scientific_name": "Zea mays",
            "common_names": ["Corn", "Maize", "Sweet Corn"],
            "confidence": 0.95
        },
        {
            "plant_name": "Tomato",
            "plant_type": "Tomato",
            "scientific_name": "Solanum lycopersicum",
            "common_names": ["Tomato", "Love Apple"],
            "confidence": 0.92
        },
        {
            "plant_name": "Potato",
            "plant_type": "Potato",
            "scientific_name": "Solanum tuberosum",
            "common_names": ["Potato", "Irish Potato"],
            "confidence": 0.89
        },
        {
            "plant_name": "Apple",
            "plant_type": "Apple",
            "scientific_name": "Malus domestica",
            "common_names": ["Apple", "Common Apple"],
            "confidence": 0.87
        },
        {
            "plant_name": "Bell Pepper",
            "plant_type": "Pepper",
            "scientific_name": "Capsicum annuum",
            "common_names": ["Bell Pepper", "Sweet Pepper"],
            "confidence": 0.91
        }
    ]
    
    # Randomly decide if we "recognize" the plant or need learning
    if random.random() > 0.3:  # 70% chance of recognition
        # Simulate successful identification
        plant = random.choice(plants)
        result = {
            "success": True,
            "plant_name": plant["plant_name"],
            "plant_type": plant["plant_type"],
            "scientific_name": plant["scientific_name"],
            "common_names": plant["common_names"],
            "confidence": plant["confidence"],
            "message": f"Plant identified as {plant['plant_name']} with {plant['confidence']*100:.1f}% confidence"
        }
    else:
        # Simulate need for learning
        result = {
            "success": False,
            "error": "I do not know this plant. Please help me learn by providing its name.",
            "needs_learning": True,
            "confidence": 0
        }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
