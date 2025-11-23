#!/usr/bin/env python3
"""
Enhanced Plant Disease Detection Training Script
- Improved ResNet architecture
- Advanced data augmentation
- Better training techniques
- Model evaluation metrics
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from sklearn.metrics import classification_report, confusion_matrix
import os
import time
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from PIL import Image
from tqdm import tqdm
import copy

# Configuration
class Config:
    # Paths
    DATASET_DIR = Path("../dataset/plantvillage dataset/color")
    MODELS_DIR = Path("models")
    LOGS_DIR = Path("logs")
    
    # Training parameters
    IMG_SIZE = 224
    BATCH_SIZE = 16  # Reduced for CPU training
    NUM_EPOCHS = 20   # Reduced for faster training
    LEARNING_RATE = 0.0001
    WEIGHT_DECAY = 1e-4
    
    # Device
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
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
            image = self.transform(image)
            
        return image, label

class EnhancedModel(nn.Module):
    """Enhanced ResNet model with improvements"""
    
    def __init__(self, num_classes, pretrained=True):
        super(EnhancedModel, self).__init__()
        
        # Use ResNet50 as backbone
        self.backbone = models.resnet50(pretrained=pretrained)
        
        # Remove the final fully connected layer
        self.backbone = nn.Sequential(*list(self.backbone.children())[:-1])
        
        # Add custom classifier with attention
        self.global_avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.global_max_pool = nn.AdaptiveMaxPool2d((1, 1))
        
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(2048 * 2, 1024),  # *2 for avg+max pooling
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(1024),
            nn.Dropout(0.3),
            nn.Linear(1024, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        # Extract features
        features = self.backbone(x)
        
        # Global pooling (both average and max)
        avg_pool = self.global_avg_pool(features).flatten(1)
        max_pool = self.global_max_pool(features).flatten(1)
        
        # Concatenate pooled features
        pooled = torch.cat([avg_pool, max_pool], dim=1)
        
        # Classification
        output = self.classifier(pooled)
        return output

def get_transforms(config):
    """Get data transforms"""
    train_transforms = transforms.Compose([
        transforms.Resize((config.IMG_SIZE, config.IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(degrees=30),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.2, scale=(0.02, 0.33), ratio=(0.3, 3.3))
    ])
    
    val_transforms = transforms.Compose([
        transforms.Resize((config.IMG_SIZE, config.IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transforms, val_transforms

def load_data(config):
    """Load and prepare data"""
    print("Loading dataset...")
    
    # Get all image paths and labels
    image_paths = []
    labels = []
    class_names = []
    
    for class_idx, class_dir in enumerate(sorted(config.DATASET_DIR.iterdir())):
        if class_dir.is_dir():
            class_names.append(class_dir.name)
            for img_path in class_dir.glob("*.JPG"):
                if img_path.is_file():
                    image_paths.append(img_path)
                    labels.append(class_idx)
    
    print(f"Found {len(image_paths)} images across {len(class_names)} classes")
    
    # Split data (80% train, 20% validation)
    from sklearn.model_selection import train_test_split
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        image_paths, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    return (train_paths, train_labels), (val_paths, val_labels), class_names

def train_model(config):
    """Train the enhanced model"""
    # Load data
    (train_paths, train_labels), (val_paths, val_labels), class_names = load_data(config)
    
    # Save class names
    with open(config.MODELS_DIR / 'enhanced_class_names.json', 'w') as f:
        json.dump(class_names, f, indent=2)
    
    # Get transforms
    train_transforms, val_transforms = get_transforms(config)
    
    # Create datasets
    train_dataset = PlantDiseaseDataset(train_paths, train_labels, class_names, train_transforms)
    val_dataset = PlantDiseaseDataset(val_paths, val_labels, class_names, val_transforms)
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False, num_workers=2)
    
    # Create model
    model = EnhancedModel(len(class_names), pretrained=True)
    model = model.to(config.DEVICE)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)  # Label smoothing for better generalization
    optimizer = optim.AdamW(model.parameters(), lr=config.LEARNING_RATE, weight_decay=config.WEIGHT_DECAY)
    
    # Learning rate scheduler
    scheduler = optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=config.LEARNING_RATE * 10, 
        epochs=config.NUM_EPOCHS, steps_per_epoch=len(train_loader),
        pct_start=0.3, anneal_strategy='cos'
    )
    
    # Training history
    history = {
        'train_loss': [], 'train_acc': [],
        'val_loss': [], 'val_acc': [],
        'lr': []
    }
    
    best_val_acc = 0
    best_model_weights = copy.deepcopy(model.state_dict())
    
    print(f"Starting training on {config.DEVICE}...")
    start_time = time.time()
    
    for epoch in range(config.NUM_EPOCHS):
        print(f'\nEpoch {epoch+1}/{config.NUM_EPOCHS}')
        print('-' * 40)
        
        # Training phase
        model.train()
        running_loss = 0.0
        running_corrects = 0
        total_samples = 0
        
        train_progress = tqdm(train_loader, desc=f'Training')
        
        for inputs, labels in train_progress:
            inputs, labels = inputs.to(config.DEVICE), labels.to(config.DEVICE)
            
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            # Backward pass
            loss.backward()
            optimizer.step()
            scheduler.step()
            
            # Statistics
            _, preds = torch.max(outputs, 1)
            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)
            total_samples += inputs.size(0)
            
            # Update progress bar
            current_acc = running_corrects.double() / total_samples * 100
            train_progress.set_postfix({
                'Loss': f'{loss.item():.4f}',
                'Acc': f'{current_acc:.2f}%',
                'LR': f'{scheduler.get_last_lr()[0]:.6f}'
            })
        
        # Calculate training metrics
        train_loss = running_loss / total_samples
        train_acc = running_corrects.double() / total_samples * 100
        current_lr = scheduler.get_last_lr()[0]
        
        # Validation phase
        model.eval()
        val_running_loss = 0.0
        val_running_corrects = 0
        val_total = 0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            val_progress = tqdm(val_loader, desc='Validation')
            
            for inputs, labels in val_progress:
                inputs, labels = inputs.to(config.DEVICE), labels.to(config.DEVICE)
                
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                _, preds = torch.max(outputs, 1)
                val_running_loss += loss.item() * inputs.size(0)
                val_running_corrects += torch.sum(preds == labels.data)
                val_total += inputs.size(0)
                
                # Store for metrics
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                
                # Update progress bar
                current_val_acc = val_running_corrects.double() / val_total * 100
                val_progress.set_postfix({
                    'Loss': f'{loss.item():.4f}',
                    'Acc': f'{current_val_acc:.2f}%'
                })
        
        # Calculate validation metrics
        val_loss = val_running_loss / val_total
        val_acc = val_running_corrects.double() / val_total * 100
        
        # Save history
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc.item())
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc.item())
        history['lr'].append(current_lr)
        
        # Print epoch results
        print(f'Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%')
        print(f'Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%')
        print(f'Learning Rate: {current_lr:.6f}')
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_weights = copy.deepcopy(model.state_dict())
            print(f'🎉 New best validation accuracy: {best_val_acc:.2f}%')
            
            # Save best model
            torch.save({
                'model_state_dict': best_model_weights,
                'class_names': class_names,
                'val_accuracy': best_val_acc.item(),
                'epoch': epoch + 1,
                'config': vars(config)
            }, config.MODELS_DIR / 'enhanced_best_model.pth')
    
    training_time = time.time() - start_time
    print(f'\nTraining completed in {training_time//60:.0f}m {training_time%60:.0f}s')
    print(f'Best validation accuracy: {best_val_acc:.2f}%')
    
    # Load best model weights
    model.load_state_dict(best_model_weights)
    
    # Save final model
    torch.save({
        'model_state_dict': model.state_dict(),
        'class_names': class_names,
        'val_accuracy': best_val_acc.item(),
        'history': history,
        'config': vars(config)
    }, config.MODELS_DIR / 'enhanced_final_model.pth')
    
    return model, history, class_names

def plot_training_history(history, config):
    """Plot training history"""
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # Loss plot
    axes[0, 0].plot(history['train_loss'], label='Training Loss', color='blue')
    axes[0, 0].plot(history['val_loss'], label='Validation Loss', color='red')
    axes[0, 0].set_title('Model Loss')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Loss')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # Accuracy plot
    axes[0, 1].plot(history['train_acc'], label='Training Accuracy', color='blue')
    axes[0, 1].plot(history['val_acc'], label='Validation Accuracy', color='red')
    axes[0, 1].set_title('Model Accuracy')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Accuracy (%)')
    axes[0, 1].legend()
    axes[0, 1].grid(True)
    
    # Learning rate plot
    axes[1, 0].plot(history['lr'], color='green')
    axes[1, 0].set_title('Learning Rate')
    axes[1, 0].set_xlabel('Epoch')
    axes[1, 0].set_ylabel('Learning Rate')
    axes[1, 0].grid(True)
    
    # Combined accuracy plot
    axes[1, 1].plot(history['val_acc'], label='Validation Accuracy', color='red', linewidth=2)
    axes[1, 1].axhline(y=max(history['val_acc']), color='red', linestyle='--', alpha=0.7)
    axes[1, 1].set_title(f'Best Validation Accuracy: {max(history["val_acc"]):.2f}%')
    axes[1, 1].set_xlabel('Epoch')
    axes[1, 1].set_ylabel('Accuracy (%)')
    axes[1, 1].legend()
    axes[1, 1].grid(True)
    
    plt.tight_layout()
    plt.savefig(config.LOGS_DIR / 'enhanced_training_history.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"📊 Training plots saved to {config.LOGS_DIR / 'enhanced_training_history.png'}")

def main():
    """Main training function"""
    config = Config()
    
    print("🌱 Enhanced Plant Disease Detection Training")
    print("=" * 60)
    print(f"Device: {config.DEVICE}")
    print(f"Dataset: {config.DATASET_DIR}")
    print(f"Image size: {config.IMG_SIZE}")
    print(f"Batch size: {config.BATCH_SIZE}")
    print(f"Epochs: {config.NUM_EPOCHS}")
    print(f"Learning rate: {config.LEARNING_RATE}")
    
    try:
        # Train model
        model, history, class_names = train_model(config)
        
        # Plot training history
        plot_training_history(history, config)
        
        print("\n🎉 Enhanced training completed successfully!")
        print(f"📁 Models saved to: {config.MODELS_DIR}")
        print(f"📊 Logs saved to: {config.LOGS_DIR}")
        print(f"🎯 Best validation accuracy: {max(history['val_acc']):.2f}%")
        
    except Exception as e:
        print(f"\n❌ Training failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
