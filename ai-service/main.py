from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import logging
from typing import Dict, Any
import uvicorn

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartFarm Plant Disease Detection API",
    description="AI-powered plant disease detection using CNN models",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and class names
model = None
class_names = []

# PlantVillage dataset class names (example - adjust based on your actual model)
PLANT_VILLAGE_CLASSES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry_(including_sour)___Powdery_mildew',
    'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot_Gray_leaf_spot',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites_Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

def load_model():
    """Load the trained CNN model"""
    global model, class_names
    
    try:
        model_path = os.getenv('MODEL_PATH', 'models/plant_disease_model.h5')
        
        if os.path.exists(model_path):
            logger.info(f"Loading model from {model_path}")
            model = tf.keras.models.load_model(model_path)
            logger.info("Model loaded successfully")
        else:
            logger.warning(f"Model file not found at {model_path}. Using mock predictions.")
            model = None
            
        class_names = PLANT_VILLAGE_CLASSES
        logger.info(f"Loaded {len(class_names)} class names")
        
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        model = None
        class_names = PLANT_VILLAGE_CLASSES

def preprocess_image(image: Image.Image, target_size=(224, 224)) -> np.ndarray:
    """Preprocess image for model prediction"""
    try:
        # Resize image
        image = image.resize(target_size)
        
        # Convert to RGB if not already
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Normalize pixel values to [0, 1]
        img_array = img_array.astype(np.float32) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise HTTPException(status_code=400, detail="Error processing image")

def generate_mock_prediction() -> Dict[str, Any]:
    """Generate a mock prediction for development/testing"""
    import random
    
    # Select a random class
    predicted_class = random.choice(class_names)
    confidence = random.uniform(0.7, 0.99)
    is_healthy = 'healthy' in predicted_class.lower()
    
    return {
        'predicted_class': predicted_class,
        'confidence': float(confidence),
        'is_healthy': is_healthy,
        'all_predictions': {predicted_class: confidence}
    }

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    logger.info("Starting AI service...")
    load_model()
    logger.info("AI service started successfully")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SmartFarm Plant Disease Detection API",
        "status": "running",
        "model_loaded": model is not None,
        "classes_count": len(class_names)
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_status": "loaded" if model is not None else "mock_mode",
        "supported_classes": len(class_names),
        "tensorflow_version": tf.__version__
    }

@app.post("/analyze")
async def analyze_plant_image(file: UploadFile = File(...)):
    """
    Analyze plant image for disease detection
    
    Returns:
    - predicted_class: The predicted disease class
    - confidence: Confidence score (0.0 to 1.0)
    - is_healthy: Boolean indicating if plant is healthy
    - all_predictions: Top predictions with scores
    """
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        logger.info(f"Processing image: {file.filename}, size: {image.size}")
        
        if model is not None:
            # Real prediction using loaded model
            processed_image = preprocess_image(image)
            
            # Make prediction
            predictions = model.predict(processed_image)
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx])
            predicted_class = class_names[predicted_class_idx]
            
            # Get top 5 predictions
            top_indices = predictions[0].argsort()[-5:][::-1]
            all_predictions = {
                class_names[i]: float(predictions[0][i]) 
                for i in top_indices
            }
            
            is_healthy = 'healthy' in predicted_class.lower()
            
            result = {
                'predicted_class': predicted_class,
                'confidence': confidence,
                'is_healthy': is_healthy,
                'all_predictions': all_predictions
            }
            
        else:
            # Mock prediction for development
            logger.info("Using mock prediction (model not loaded)")
            result = generate_mock_prediction()
        
        logger.info(f"Prediction result: {result['predicted_class']} ({result['confidence']:.3f})")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Error analyzing image")

@app.get("/classes")
async def get_supported_classes():
    """Get list of supported plant disease classes"""
    return {
        "classes": class_names,
        "count": len(class_names)
    }

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
