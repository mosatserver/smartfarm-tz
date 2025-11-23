#!/usr/bin/env python3
"""
Quick test for enhanced training script
Tests data loading, model creation, and basic training loop
"""

import torch
import torch.nn as nn
from torchvision import transforms, models
from pathlib import Path
import json
import numpy as np
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import timm

# Test configuration
class TestConfig:
    DATASET_DIR = Path("../dataset/plantvillage dataset/color")
    IMG_SIZE = 224
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def test_data_loading():
    """Test data loading"""
    print("🧪 Testing data loading...")
    config = TestConfig()
    
    # Get sample classes (limit to 3 for testing)
    class_dirs = list(config.DATASET_DIR.iterdir())[:3]
    image_paths = []
    labels = []
    class_names = []
    
    for class_idx, class_dir in enumerate(class_dirs):
        if class_dir.is_dir():
            class_names.append(class_dir.name)
            # Get only first 5 images per class for testing
            for img_path in list(class_dir.glob("*.JPG"))[:5]:
                image_paths.append(img_path)
                labels.append(class_idx)
    
    print(f"✅ Found {len(image_paths)} images across {len(class_names)} classes")
    print(f"Classes: {class_names}")
    return image_paths, labels, class_names

def test_augmentation():
    """Test data augmentation"""
    print("\n🧪 Testing data augmentation...")
    
    train_transforms = A.Compose([
        A.Resize(height=224, width=224),
        A.HorizontalFlip(p=0.5),
        A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.7),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2()
    ])
    
    # Test with sample image
    image_paths, _, _ = test_data_loading()
    sample_image = Image.open(image_paths[0]).convert('RGB')
    
    # Apply augmentation
    augmented = train_transforms(image=np.array(sample_image))
    augmented_tensor = augmented['image']
    
    print(f"✅ Original image shape: {np.array(sample_image).shape}")
    print(f"✅ Augmented tensor shape: {augmented_tensor.shape}")
    print(f"✅ Tensor dtype: {augmented_tensor.dtype}")
    print(f"✅ Tensor range: [{augmented_tensor.min():.3f}, {augmented_tensor.max():.3f}]")

def test_model_creation():
    """Test model creation"""
    print("\n🧪 Testing model architectures...")
    config = TestConfig()
    
    # Test ResNet50
    print("Testing ResNet50...")
    model_resnet = models.resnet50(pretrained=True)
    model_resnet.fc = nn.Sequential(
        nn.Dropout(0.5),
        nn.Linear(model_resnet.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, 3)  # 3 classes for testing
    )
    model_resnet = model_resnet.to(config.DEVICE)
    print(f"✅ ResNet50 created successfully on {config.DEVICE}")
    
    # Test EfficientNet
    print("Testing EfficientNet-B3...")
    try:
        model_efficient = timm.create_model('efficientnet_b3', pretrained=True, num_classes=3)
        model_efficient = model_efficient.to(config.DEVICE)
        print(f"✅ EfficientNet-B3 created successfully on {config.DEVICE}")
    except Exception as e:
        print(f"❌ EfficientNet-B3 failed: {e}")
    
    # Test Vision Transformer
    print("Testing Vision Transformer...")
    try:
        model_vit = timm.create_model('vit_base_patch16_224', pretrained=True, num_classes=3)
        model_vit = model_vit.to(config.DEVICE)
        print(f"✅ Vision Transformer created successfully on {config.DEVICE}")
    except Exception as e:
        print(f"❌ Vision Transformer failed: {e}")

def test_forward_pass():
    """Test forward pass with sample data"""
    print("\n🧪 Testing forward pass...")
    config = TestConfig()
    
    # Create sample batch
    batch_size = 2
    sample_batch = torch.randn(batch_size, 3, config.IMG_SIZE, config.IMG_SIZE).to(config.DEVICE)
    
    # Test ResNet50
    model = models.resnet50(pretrained=False)
    model.fc = nn.Linear(model.fc.in_features, 3)
    model = model.to(config.DEVICE)
    model.eval()
    
    with torch.no_grad():
        outputs = model(sample_batch)
        print(f"✅ Forward pass successful")
        print(f"✅ Input shape: {sample_batch.shape}")
        print(f"✅ Output shape: {outputs.shape}")
        print(f"✅ Output range: [{outputs.min():.3f}, {outputs.max():.3f}]")

def test_loss_and_optimizer():
    """Test loss function and optimizer"""
    print("\n🧪 Testing loss and optimizer...")
    config = TestConfig()
    
    # Create model
    model = models.resnet18(pretrained=False)
    model.fc = nn.Linear(model.fc.in_features, 3)
    model = model.to(config.DEVICE)
    
    # Create optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    
    # Sample data
    inputs = torch.randn(4, 3, 224, 224).to(config.DEVICE)
    targets = torch.randint(0, 3, (4,)).to(config.DEVICE)
    
    # Forward pass
    model.train()
    optimizer.zero_grad()
    outputs = model(inputs)
    loss = criterion(outputs, targets)
    loss.backward()
    optimizer.step()
    
    print(f"✅ Training step completed")
    print(f"✅ Loss: {loss.item():.4f}")
    print(f"✅ Predictions shape: {outputs.shape}")

def main():
    """Run all tests"""
    print("🚀 Enhanced Model Training - Component Tests")
    print("=" * 60)
    
    try:
        # Test individual components
        test_data_loading()
        test_augmentation()
        test_model_creation()
        test_forward_pass()
        test_loss_and_optimizer()
        
        print("\n🎉 All tests passed successfully!")
        print("✅ Ready to run full enhanced training script")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
