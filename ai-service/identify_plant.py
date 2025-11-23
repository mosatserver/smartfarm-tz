#!/usr/bin/env python3
"""
Plant Identification Script for SmartFarm TZ
This script identifies plant types from uploaded images using image comparison
with a PlantVillage dataset and learns from user feedback.
"""

import sys
import json
import os
import numpy as np
import cv2
from PIL import Image
import pickle
from datetime import datetime
import shutil
import hashlib
from pathlib import Path

# Configuration
CONFIG = {
    'dataset_path': 'ai-service/plant_dataset',
    'learned_dataset_path': 'ai-service/learned_plants',
    'similarity_threshold': 0.7,  # Threshold for image similarity
    'image_size': (224, 224),  # Standard size for comparison
    'features_cache': 'ai-service/features_cache.pkl'
}

# Plant identification database (kept for backward compatibility)
PLANT_DATABASE = {
    'maize': {
        'plant_name': 'Maize',
        'plant_type': 'Corn',
        'scientific_name': 'Zea mays',
        'common_names': ['Corn', 'Maize', 'Sweet Corn', 'Field Corn'],
        'keywords': ['corn', 'maize', 'yellow', 'kernel', 'cob', 'stalk']
    },
    'tomato': {
        'plant_name': 'Tomato',
        'plant_type': 'Tomato',
        'scientific_name': 'Solanum lycopersicum',
        'common_names': ['Tomato', 'Love Apple', 'Cherry Tomato'],
        'keywords': ['tomato', 'red', 'fruit', 'vine', 'greenhouse']
    },
    'apple': {
        'plant_name': 'Apple',
        'plant_type': 'Apple',
        'scientific_name': 'Malus domestica',
        'common_names': ['Apple', 'Common Apple', 'Orchard Apple'],
        'keywords': ['apple', 'fruit', 'tree', 'orchard', 'red', 'green']
    }
}

def preprocess_image(image_path):
    """
    Preprocess image for feature extraction.
    """
    try:
        # Read image using OpenCV
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to standard size
        image = cv2.resize(image, CONFIG['image_size'])
        
        # Normalize pixel values
        image = image.astype(np.float32) / 255.0
        
        return image
    except Exception as e:
        raise ValueError(f"Image preprocessing failed: {str(e)}")

def extract_features(image):
    """
    Extract features from preprocessed image using histogram and edge detection.
    """
    try:
        # Convert to different color spaces for feature extraction
        gray = cv2.cvtColor((image * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor((image * 255).astype(np.uint8), cv2.COLOR_RGB2HSV)
        
        # Color histogram features
        hist_r = cv2.calcHist([image[:,:,0]], [0], None, [32], [0, 1])
        hist_g = cv2.calcHist([image[:,:,1]], [0], None, [32], [0, 1])
        hist_b = cv2.calcHist([image[:,:,2]], [0], None, [32], [0, 1])
        hist_h = cv2.calcHist([hsv[:,:,0]], [0], None, [32], [0, 180])
        hist_s = cv2.calcHist([hsv[:,:,1]], [0], None, [32], [0, 256])
        
        # Edge features
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        
        # Texture features (using LBP-like approach)
        texture_features = []
        for i in range(1, gray.shape[0]-1):
            for j in range(1, gray.shape[1]-1):
                center = gray[i, j]
                pattern = 0
                pattern += (gray[i-1, j-1] > center) * 1
                pattern += (gray[i-1, j] > center) * 2
                pattern += (gray[i-1, j+1] > center) * 4
                pattern += (gray[i, j+1] > center) * 8
                pattern += (gray[i+1, j+1] > center) * 16
                pattern += (gray[i+1, j] > center) * 32
                pattern += (gray[i+1, j-1] > center) * 64
                pattern += (gray[i, j-1] > center) * 128
                texture_features.append(pattern)
        
        texture_hist = np.histogram(texture_features, bins=16, range=(0, 255))[0]
        
        # Combine all features
        features = np.concatenate([
            hist_r.flatten(),
            hist_g.flatten(),
            hist_b.flatten(),
            hist_h.flatten(),
            hist_s.flatten(),
            [edge_density],
            texture_hist.flatten()
        ])
        
        return features.astype(np.float32)
    except Exception as e:
        raise ValueError(f"Feature extraction failed: {str(e)}")

def calculate_similarity(features1, features2):
    """
    Calculate similarity between two feature vectors using cosine similarity.
    """
    try:
        # Normalize features
        norm1 = np.linalg.norm(features1)
        norm2 = np.linalg.norm(features2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Cosine similarity
        similarity = np.dot(features1, features2) / (norm1 * norm2)
        return float(similarity)
    except Exception as e:
        print(f"Similarity calculation error: {e}")
        return 0.0

def identify_plant(image_path):
    """
    Identify plant by comparing image with PlantVillage dataset.
    """
    try:
        # Check if image exists and is valid
        if not os.path.exists(image_path):
            return {
                'success': False,
                'error': f'Image file not found: {image_path}'
            }
        
        # Try to open and validate the image
        try:
            with Image.open(image_path) as img:
                img.verify()
        except Exception as e:
            return {
                'success': False,
                'error': f'Invalid image file: {str(e)}'
            }
        
        # Preprocess image
        image = preprocess_image(image_path)
        features = extract_features(image)

        # Check cache for learned features
        if os.path.exists(CONFIG['features_cache']):
            with open(CONFIG['features_cache'], 'rb') as f:
                cached_features = pickle.load(f)
        else:
            cached_features = {}

        max_similarity = 0
        best_match_name = None

        # Compare with each image in dataset (if dataset exists)
        dataset_path = Path(CONFIG['dataset_path'])
        if dataset_path.exists():
            for label_dir in dataset_path.iterdir():
                if label_dir.is_dir():
                    for image_file in label_dir.glob('*.jpg'):
                        try:
                            dataset_image = preprocess_image(str(image_file))
                            dataset_features = extract_features(dataset_image)
                            similarity = calculate_similarity(features, dataset_features)

                            if similarity > max_similarity:
                                max_similarity = similarity
                                best_match_name = label_dir.name
                        except Exception as e:
                            print(f"Error processing {image_file}: {e}")
                            continue

        # Compare with learned images (if any exist)
        learned_path = Path(CONFIG['learned_dataset_path'])
        if learned_path.exists():
            for learned_file in learned_path.glob('*.jpg'):
                try:
                    learned_name = learned_file.stem.split('_')[0]  # Extract plant name before timestamp
                    if learned_name in cached_features:
                        learned_features = cached_features[learned_name]
                    else:
                        learned_image = preprocess_image(str(learned_file))
                        learned_features = extract_features(learned_image)
                        cached_features[learned_name] = learned_features

                    similarity = calculate_similarity(features, learned_features)

                    if similarity > max_similarity:
                        max_similarity = similarity
                        best_match_name = learned_name
                except Exception as e:
                    print(f"Error processing learned image {learned_file}: {e}")
                    continue

        # Update cache
        os.makedirs(os.path.dirname(CONFIG['features_cache']), exist_ok=True)
        with open(CONFIG['features_cache'], 'wb') as f:
            pickle.dump(cached_features, f)

        if max_similarity > CONFIG['similarity_threshold']:
            return {
                'success': True,
                'plant_name': best_match_name,
                'confidence': round(max_similarity, 3),
                'message': f'Plant identified as {best_match_name} with {round(max_similarity * 100, 1)}% confidence'
            }
        else:
            return {
                'success': False,
                'error': 'I do not know this plant. Please help me learn by providing its name.',
                'needs_learning': True,
                'confidence': round(max_similarity, 3) if max_similarity > 0 else 0
            }

    except Exception as e:
        return {
            'success': False,
            'error': f'Plant identification failed: {str(e)}'
        }

def learn_plant(image_path, plant_name):
    """
    Learn a new plant by storing the image and its name.
    """
    try:
        # Validate inputs
        if not os.path.exists(image_path):
            return {
                'success': False,
                'error': f'Image file not found: {image_path}'
            }
        
        if not plant_name or not plant_name.strip():
            return {
                'success': False,
                'error': 'Plant name cannot be empty'
            }
        
        # Clean plant name
        plant_name = plant_name.strip().lower().replace(' ', '_')
        
        # Create learned plants directory
        learned_path = Path(CONFIG['learned_dataset_path'])
        learned_path.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        image_hash = hashlib.md5(open(image_path, 'rb').read()).hexdigest()[:8]
        filename = f"{plant_name}_{timestamp}_{image_hash}.jpg"
        destination = learned_path / filename
        
        # Copy image to learned dataset
        shutil.copy2(image_path, destination)
        
        # Update features cache
        image = preprocess_image(str(destination))
        features = extract_features(image)
        
        if os.path.exists(CONFIG['features_cache']):
            with open(CONFIG['features_cache'], 'rb') as f:
                cached_features = pickle.load(f)
        else:
            cached_features = {}
        
        cached_features[plant_name] = features
        
        with open(CONFIG['features_cache'], 'wb') as f:
            pickle.dump(cached_features, f)
        
        # Log the learning event
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'plant_name': plant_name,
            'image_path': str(destination),
            'original_path': image_path
        }
        
        log_file = learned_path / 'learning_log.json'
        if log_file.exists():
            with open(log_file, 'r') as f:
                log_data = json.load(f)
        else:
            log_data = []
        
        log_data.append(log_entry)
        
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        return {
            'success': True,
            'message': f'Successfully learned new plant: {plant_name}',
            'plant_name': plant_name,
            'stored_path': str(destination)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Learning failed: {str(e)}'
        }

def main():
    """Main function to handle command line arguments and run identification."""
    if len(sys.argv) < 2:
        result = {
            'success': False,
            'error': 'Usage: python identify_plant.py <image_path> [plant_name_for_learning]'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Check if this is a learning request (plant name provided)
    if len(sys.argv) == 3:
        plant_name = sys.argv[2]
        try:
            result = learn_plant(image_path, plant_name)
            print(json.dumps(result, indent=2))
            sys.exit(0 if result['success'] else 1)
        except Exception as e:
            error_result = {
                'success': False,
                'error': f'Learning failed: {str(e)}'
            }
            print(json.dumps(error_result))
            sys.exit(1)
    
    # Regular identification
    try:
        # Run plant identification
        result = identify_plant(image_path)
        
        # Output JSON result
        print(json.dumps(result, indent=2))
        
        # Exit with appropriate code
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
