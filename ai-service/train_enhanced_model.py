#!/usr/bin/env python3
"""
Enhanced Plant Disease Detection Model Training Script
Features:
- Multiple pre-trained model architectures (ResNet, EfficientNet, Vision Transformer)
- Advanced data augmentation with Albumentations
- Cross-validation
- Learning rate scheduling
- Model ensemble
- Comprehensive evaluation metrics
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
import torch.nn.functional as F
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import os
import time
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# Configuration
class Config:
    # Paths
    DATASET_DIR = Path("../dataset/plantvillage dataset/color")
    MODELS_DIR = Path("models")
    LOGS_DIR = Path("logs")
    
    # Training parameters
    IMG_SIZE = 224
    BATCH_SIZE = 32
    NUM_EPOCHS = 50
    LEARNING_RATE = 0.001
    WEIGHT_DECAY = 1e-4
    NUM_FOLDS = 5
    
    # Model parameters
    MODEL_ARCHITECTURES = ['resnet50', 'efficientnet_b3', 'vit_base_patch16_224']
    PRETRAINED = True
    FREEZE_BACKBONE = False
    
    # Device
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Early stopping
    PATIENCE = 10
    MIN_DELTA = 0.001

    def __init__(self):
        self.MODELS_DIR.mkdir(exist_ok=True)
        self.LOGS_DIR.mkdir(exist_ok=True)

class PlantDiseaseDataset(Dataset):
    """Custom dataset class for plant disease detection"""
    
    def __init__(self, image_paths, labels, class_names, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.class_names = class_names
        self.transform = transform
        
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        image_path = self.image_paths[idx]
        image = Image.open(image_path).convert('RGB')
        label = self.labels[idx]
        
        if self.transform:
            image = np.array(image)
            augmented = self.transform(image=image)
            image = augmented['image']
        else:
            image = transforms.ToTensor()(image)
            
        return image, label, str(image_path)

class DataAugmentation:
    """Advanced data augmentation using Albumentations"""
    
    @staticmethod
    def get_train_transforms(img_size=224):
        return A.Compose([
            A.Resize(height=img_size, width=img_size),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.3),
            A.RandomRotate90(p=0.5),
            A.Rotate(limit=30, p=0.7),
            A.RandomBrightnessContrast(
                brightness_limit=0.2, 
                contrast_limit=0.2, 
                p=0.7
            ),
            A.HueSaturationValue(
                hue_shift_limit=20,
                sat_shift_limit=30,
                val_shift_limit=20,
                p=0.7
            ),
            A.ShiftScaleRotate(
                shift_limit=0.1,
                scale_limit=0.2,
                rotate_limit=30,
                p=0.7
            ),
            A.CoarseDropout(
                max_holes=8,
                max_height=32,
                max_width=32,
                min_holes=1,
                fill_value=0,
                p=0.3
            ),
            A.GaussNoise(var_limit=(10.0, 50.0), p=0.3),
            A.GaussianBlur(blur_limit=3, p=0.3),
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
            ToTensorV2()
        ])
    
    @staticmethod
    def get_val_transforms(img_size=224):
        return A.Compose([
            A.Resize(height=img_size, width=img_size),
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
            ToTensorV2()
        ])

class ModelFactory:
    """Factory class for creating different model architectures"""
    
    @staticmethod
    def create_model(architecture, num_classes, pretrained=True):
        if architecture == 'resnet50':
            model = models.resnet50(pretrained=pretrained)
            model.fc = nn.Sequential(
                nn.Dropout(0.5),
                nn.Linear(model.fc.in_features, 512),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(512, num_classes)
            )
        
        elif architecture == 'efficientnet_b3':
            try:
                import timm
                model = timm.create_model('efficientnet_b3', pretrained=pretrained, num_classes=num_classes)
                model.classifier = nn.Sequential(
                    nn.Dropout(0.5),
                    nn.Linear(model.classifier.in_features, 512),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    nn.Linear(512, num_classes)
                )
            except ImportError:
                print("timm not available, using ResNet50 instead")
                return ModelFactory.create_model('resnet50', num_classes, pretrained)
                
        elif architecture == 'vit_base_patch16_224':
            try:
                import timm
                model = timm.create_model('vit_base_patch16_224', pretrained=pretrained, num_classes=num_classes)
            except ImportError:
                print("timm not available, using ResNet50 instead")
                return ModelFactory.create_model('resnet50', num_classes, pretrained)
        
        else:
            raise ValueError(f"Unknown architecture: {architecture}")
            
        return model

class EarlyStopping:
    """Early stopping to avoid overfitting"""
    
    def __init__(self, patience=7, min_delta=0, restore_best_weights=True):
        self.patience = patience
        self.min_delta = min_delta
        self.restore_best_weights = restore_best_weights
        self.best_loss = None
        self.counter = 0
        self.best_weights = None

    def __call__(self, val_loss, model):
        if self.best_loss is None:
            self.best_loss = val_loss
            self.save_checkpoint(model)
        elif val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            self.save_checkpoint(model)
        else:
            self.counter += 1

        if self.counter >= self.patience:
            if self.restore_best_weights:
                model.load_state_dict(self.best_weights)
            return True
        return False

    def save_checkpoint(self, model):
        self.best_weights = model.state_dict().copy()

class ModelTrainer:
    """Main trainer class"""
    
    def __init__(self, config):
        self.config = config
        self.device = config.DEVICE
        print(f"Using device: {self.device}")
        
    def load_data(self):
        """Load and prepare data"""
        print("Loading dataset...")
        
        # Get all image paths and labels
        image_paths = []
        labels = []
        class_names = []
        
        for class_idx, class_dir in enumerate(sorted(self.config.DATASET_DIR.iterdir())):
            if class_dir.is_dir():
                class_names.append(class_dir.name)
                for img_path in class_dir.glob("*.JPG"):
                    if img_path.is_file():
                        image_paths.append(img_path)
                        labels.append(class_idx)
        
        print(f"Found {len(image_paths)} images across {len(class_names)} classes")
        print(f"Classes: {class_names[:5]}...")
        
        return np.array(image_paths), np.array(labels), class_names
    
    def train_fold(self, model, train_loader, val_loader, fold):
        """Train a single fold"""
        optimizer = optim.AdamW(
            model.parameters(),
            lr=self.config.LEARNING_RATE,
            weight_decay=self.config.WEIGHT_DECAY
        )
        
        scheduler = optim.lr_scheduler.OneCycleLR(
            optimizer,
            max_lr=self.config.LEARNING_RATE,
            epochs=self.config.NUM_EPOCHS,
            steps_per_epoch=len(train_loader),
            pct_start=0.3
        )
        
        criterion = nn.CrossEntropyLoss()
        early_stopping = EarlyStopping(patience=self.config.PATIENCE)
        
        train_losses = []
        val_losses = []
        train_accs = []
        val_accs = []
        
        for epoch in range(self.config.NUM_EPOCHS):
            # Training phase
            model.train()
            train_loss = 0
            train_correct = 0
            train_total = 0
            
            progress_bar = tqdm(train_loader, desc=f"Fold {fold+1} Epoch {epoch+1}/{self.config.NUM_EPOCHS}")
            
            for images, labels, _ in progress_bar:
                images, labels = images.to(self.device), labels.to(self.device)
                
                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                scheduler.step()
                
                train_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                train_total += labels.size(0)
                train_correct += (predicted == labels).sum().item()
                
                progress_bar.set_postfix({
                    'Loss': f'{loss.item():.4f}',
                    'Acc': f'{100.*train_correct/train_total:.2f}%'
                })
            
            # Validation phase
            model.eval()
            val_loss = 0
            val_correct = 0
            val_total = 0
            
            with torch.no_grad():
                for images, labels, _ in val_loader:
                    images, labels = images.to(self.device), labels.to(self.device)
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                    
                    val_loss += loss.item()
                    _, predicted = torch.max(outputs.data, 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()
            
            # Calculate metrics
            avg_train_loss = train_loss / len(train_loader)
            avg_val_loss = val_loss / len(val_loader)
            train_acc = 100. * train_correct / train_total
            val_acc = 100. * val_correct / val_total
            
            train_losses.append(avg_train_loss)
            val_losses.append(avg_val_loss)
            train_accs.append(train_acc)
            val_accs.append(val_acc)
            
            print(f"Epoch {epoch+1}/{self.config.NUM_EPOCHS}")
            print(f"Train Loss: {avg_train_loss:.4f}, Train Acc: {train_acc:.2f}%")
            print(f"Val Loss: {avg_val_loss:.4f}, Val Acc: {val_acc:.2f}%")
            print("-" * 60)
            
            # Early stopping
            if early_stopping(avg_val_loss, model):
                print(f"Early stopping triggered at epoch {epoch+1}")
                break
        
        return model, {
            'train_losses': train_losses,
            'val_losses': val_losses,
            'train_accs': train_accs,
            'val_accs': val_accs
        }
    
    def train_with_cross_validation(self, architecture='resnet50'):
        """Train model using cross-validation"""
        print(f"\n🚀 Training {architecture} with {self.config.NUM_FOLDS}-fold cross-validation")
        
        # Load data
        image_paths, labels, class_names = self.load_data()
        
        # Save class names
        with open(self.config.MODELS_DIR / 'enhanced_class_names.json', 'w') as f:
            json.dump(class_names, f, indent=2)
        
        # Cross-validation
        skf = StratifiedKFold(n_splits=self.config.NUM_FOLDS, shuffle=True, random_state=42)
        fold_results = []
        
        for fold, (train_idx, val_idx) in enumerate(skf.split(image_paths, labels)):
            print(f"\n📊 Training Fold {fold + 1}/{self.config.NUM_FOLDS}")
            
            # Split data
            train_paths, val_paths = image_paths[train_idx], image_paths[val_idx]
            train_labels, val_labels = labels[train_idx], labels[val_idx]
            
            # Create datasets
            train_dataset = PlantDiseaseDataset(
                train_paths, train_labels, class_names,
                transform=DataAugmentation.get_train_transforms(self.config.IMG_SIZE)
            )
            val_dataset = PlantDiseaseDataset(
                val_paths, val_labels, class_names,
                transform=DataAugmentation.get_val_transforms(self.config.IMG_SIZE)
            )
            
            # Create data loaders
            train_loader = DataLoader(
                train_dataset, batch_size=self.config.BATCH_SIZE,
                shuffle=True, num_workers=4, pin_memory=True
            )
            val_loader = DataLoader(
                val_dataset, batch_size=self.config.BATCH_SIZE,
                shuffle=False, num_workers=4, pin_memory=True
            )
            
            # Create model
            model = ModelFactory.create_model(architecture, len(class_names), self.config.PRETRAINED)
            model = model.to(self.device)
            
            # Train fold
            model, fold_history = self.train_fold(model, train_loader, val_loader, fold)
            
            # Save fold model
            model_path = self.config.MODELS_DIR / f'{architecture}_fold_{fold+1}.pth'
            torch.save({
                'model_state_dict': model.state_dict(),
                'class_names': class_names,
                'architecture': architecture,
                'fold': fold + 1,
                'history': fold_history
            }, model_path)
            
            fold_results.append(fold_history)
            print(f"✅ Fold {fold + 1} completed. Model saved to {model_path}")
        
        # Calculate average metrics
        avg_results = self.calculate_average_metrics(fold_results)
        
        # Save results
        results_path = self.config.LOGS_DIR / f'{architecture}_cv_results.json'
        with open(results_path, 'w') as f:
            json.dump({
                'architecture': architecture,
                'config': vars(self.config),
                'average_results': avg_results,
                'fold_results': fold_results
            }, f, indent=2, default=str)
        
        print(f"\n🎉 Cross-validation completed!")
        print(f"📊 Average validation accuracy: {avg_results['avg_val_acc']:.2f}% ± {avg_results['std_val_acc']:.2f}%")
        print(f"💾 Results saved to {results_path}")
        
        return avg_results
    
    def calculate_average_metrics(self, fold_results):
        """Calculate average metrics across folds"""
        final_val_accs = [fold['val_accs'][-1] for fold in fold_results]
        final_train_accs = [fold['train_accs'][-1] for fold in fold_results]
        
        return {
            'avg_val_acc': np.mean(final_val_accs),
            'std_val_acc': np.std(final_val_accs),
            'avg_train_acc': np.mean(final_train_accs),
            'std_train_acc': np.std(final_train_accs),
            'fold_val_accs': final_val_accs,
            'fold_train_accs': final_train_accs
        }
    
    def create_ensemble_model(self, architectures=None):
        """Create ensemble model from different architectures"""
        if architectures is None:
            architectures = self.config.MODEL_ARCHITECTURES
        
        print(f"\n🎯 Creating ensemble model from {len(architectures)} architectures")
        
        ensemble_results = {}
        for arch in architectures:
            if arch in ['efficientnet_b3', 'vit_base_patch16_224']:
                try:
                    import timm
                except ImportError:
                    print(f"Skipping {arch} - timm not installed")
                    continue
            
            print(f"Training {arch}...")
            result = self.train_with_cross_validation(arch)
            ensemble_results[arch] = result
        
        # Create ensemble prediction script
        self.create_ensemble_predictor(list(ensemble_results.keys()))
        
        return ensemble_results

    def create_ensemble_predictor(self, architectures):
        """Create ensemble prediction script"""
        ensemble_code = f'''#!/usr/bin/env python3
"""
Ensemble Model Predictor for Plant Disease Detection
Combines predictions from multiple trained models for better accuracy
"""

import torch
import torch.nn as nn
from torchvision import transforms, models
import json
import numpy as np
from PIL import Image
from pathlib import Path
import sys

class EnsemblePredictor:
    def __init__(self, models_dir="models"):
        self.models_dir = Path(models_dir)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.models = {{}}
        self.class_names = None
        
        # Load class names
        with open(self.models_dir / 'enhanced_class_names.json', 'r') as f:
            self.class_names = json.load(f)
        
        # Load models
        self.load_models()
        
        # Image transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    
    def load_models(self):
        """Load all trained models"""
        architectures = {architectures}
        
        for arch in architectures:
            arch_models = []
            for fold in range(1, 6):  # 5 folds
                model_path = self.models_dir / f'{{arch}}_fold_{{fold}}.pth'
                if model_path.exists():
                    # Create model
                    if arch == 'resnet50':
                        model = models.resnet50(pretrained=False)
                        model.fc = nn.Sequential(
                            nn.Dropout(0.5),
                            nn.Linear(model.fc.in_features, 512),
                            nn.ReLU(),
                            nn.Dropout(0.3),
                            nn.Linear(512, len(self.class_names))
                        )
                    else:
                        try:
                            import timm
                            if arch == 'efficientnet_b3':
                                model = timm.create_model('efficientnet_b3', pretrained=False, num_classes=len(self.class_names))
                                model.classifier = nn.Sequential(
                                    nn.Dropout(0.5),
                                    nn.Linear(model.classifier.in_features, 512),
                                    nn.ReLU(),
                                    nn.Dropout(0.3),
                                    nn.Linear(512, len(self.class_names))
                                )
                            elif arch == 'vit_base_patch16_224':
                                model = timm.create_model('vit_base_patch16_224', pretrained=False, num_classes=len(self.class_names))
                        except ImportError:
                            continue
                    
                    # Load weights
                    checkpoint = torch.load(model_path, map_location=self.device)
                    model.load_state_dict(checkpoint['model_state_dict'])
                    model.to(self.device)
                    model.eval()
                    
                    arch_models.append(model)
            
            if arch_models:
                self.models[arch] = arch_models
                print(f"Loaded {{len(arch_models)}} models for {{arch}}")
    
    def predict(self, image_path, use_tta=True):
        """Make ensemble prediction"""
        try:
            # Load and preprocess image
            image = Image.open(image_path).convert('RGB')
            
            if use_tta:
                # Test Time Augmentation
                predictions = []
                
                # Original image
                img_tensor = self.transform(image).unsqueeze(0).to(self.device)
                predictions.append(self.get_ensemble_prediction(img_tensor))
                
                # Horizontal flip
                img_flip = transforms.functional.hflip(image)
                img_tensor = self.transform(img_flip).unsqueeze(0).to(self.device)
                predictions.append(self.get_ensemble_prediction(img_tensor))
                
                # Average predictions
                final_probs = np.mean(predictions, axis=0)
            else:
                img_tensor = self.transform(image).unsqueeze(0).to(self.device)
                final_probs = self.get_ensemble_prediction(img_tensor)
            
            # Get top prediction
            predicted_idx = np.argmax(final_probs)
            confidence = final_probs[predicted_idx]
            predicted_class = self.class_names[predicted_idx]
            
            # Get top 3 predictions
            top3_indices = np.argsort(final_probs)[-3:][::-1]
            top_predictions = []
            for idx in top3_indices:
                top_predictions.append({{
                    'class': self.class_names[idx],
                    'confidence': float(final_probs[idx])
                }})
            
            return {{
                'success': True,
                'predicted_class': predicted_class,
                'confidence': float(confidence),
                'top_predictions': top_predictions,
                'ensemble_used': list(self.models.keys()),
                'tta_used': use_tta
            }}
            
        except Exception as e:
            return {{
                'success': False,
                'error': str(e)
            }}
    
    def get_ensemble_prediction(self, img_tensor):
        """Get prediction from ensemble of models"""
        all_predictions = []
        
        with torch.no_grad():
            for arch, models in self.models.items():
                arch_predictions = []
                for model in models:
                    outputs = model(img_tensor)
                    probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                    arch_predictions.append(probabilities.cpu().numpy())
                
                # Average across folds for this architecture
                arch_avg = np.mean(arch_predictions, axis=0)
                all_predictions.append(arch_avg)
        
        # Average across architectures
        final_prediction = np.mean(all_predictions, axis=0)
        return final_prediction

def main():
    if len(sys.argv) != 2:
        print("Usage: python ensemble_predict.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        predictor = EnsemblePredictor()
        result = predictor.predict(image_path, use_tta=True)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {{str(e)}}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
        
        with open('ensemble_predict.py', 'w') as f:
            f.write(ensemble_code)
        
        print("✅ Ensemble predictor created: ensemble_predict.py")

def main():
    """Main training function"""
    config = Config()
    trainer = ModelTrainer(config)
    
    print("🌱 Enhanced Plant Disease Detection Model Training")
    print("=" * 60)
    
    # Train ensemble of models
    results = trainer.create_ensemble_model()
    
    print("\n🎉 Training completed!")
    print("📊 Results summary:")
    for arch, result in results.items():
        print(f"  {arch}: {result['avg_val_acc']:.2f}% ± {result['std_val_acc']:.2f}%")

if __name__ == "__main__":
    main()
