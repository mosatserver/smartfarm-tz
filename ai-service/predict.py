import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import json
import sys
import os

class PlantDiseaseModel:
    def __init__(self, model_path, class_names_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load class names
        with open(class_names_path, 'r') as f:
            self.class_names = json.load(f)
        
        # Initialize model architecture (same as training)
        self.model = models.resnet18(weights=None)
        num_features = self.model.fc.in_features
        self.model.fc = nn.Linear(num_features, len(self.class_names))
        
        # Load trained weights
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Define image transforms (same as training)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    
    def predict(self, image_path):
        """
        Predict plant disease from image
        Returns: dict with prediction results
        """
        try:
            # Load and preprocess image
            image = Image.open(image_path).convert('RGB')
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Make prediction
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                
                # Get top prediction
                predicted_idx = torch.argmax(probabilities).item()
                confidence = probabilities[predicted_idx].item()
                predicted_class = self.class_names[predicted_idx]
                
                # Get top 3 predictions
                top3_prob, top3_indices = torch.topk(probabilities, 3)
                top_predictions = []
                for i in range(3):
                    top_predictions.append({
                        'class': self.class_names[top3_indices[i].item()],
                        'confidence': top3_prob[i].item()
                    })
                
                return {
                    'success': True,
                    'predicted_class': predicted_class,
                    'confidence': confidence,
                    'top_predictions': top_predictions
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

def main():
    if len(sys.argv) != 2:
        print("Usage: python predict.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found")
        sys.exit(1)
    
    # Initialize model
    model_path = 'models/best_model_pytorch.pth'
    class_names_path = 'models/class_names.json'
    
    if not os.path.exists(model_path):
        print(f"Error: Model file '{model_path}' not found")
        sys.exit(1)
    
    if not os.path.exists(class_names_path):
        print(f"Error: Class names file '{class_names_path}' not found")
        sys.exit(1)
    
    try:
        predictor = PlantDiseaseModel(model_path, class_names_path)
        result = predictor.predict(image_path)
        
        if result['success']:
            print(json.dumps(result, indent=2))
        else:
            print(f"Prediction failed: {result['error']}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error initializing model: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
