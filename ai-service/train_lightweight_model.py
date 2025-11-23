import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
import os
import time
import copy
import json

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f'Using device: {device}')

# Set image dimensions and batch size - optimized for CPU
img_height = 224
img_width = 224
batch_size = 8    # Very small batch size for CPU
num_epochs = 3    # Just a few epochs for initial model
learning_rate = 0.001

# Path to the dataset
dataset_dir = os.path.join(os.path.dirname(os.getcwd()), 'dataset')
train_dir = os.path.join(dataset_dir, 'train')
validation_dir = os.path.join(dataset_dir, 'validation')

# Simplified data transforms
data_transforms = {
    'train': transforms.Compose([
        transforms.Resize((img_height, img_width)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]),
    'validation': transforms.Compose([
        transforms.Resize((img_height, img_width)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
}

# Load datasets
image_datasets = {
    'train': datasets.ImageFolder(train_dir, data_transforms['train']),
    'validation': datasets.ImageFolder(validation_dir, data_transforms['validation'])
}

# Create data loaders with minimal workers
dataloaders = {
    'train': DataLoader(image_datasets['train'], batch_size=batch_size, shuffle=True, num_workers=0),
    'validation': DataLoader(image_datasets['validation'], batch_size=batch_size, shuffle=False, num_workers=0)
}

dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'validation']}
class_names = image_datasets['train'].classes
num_classes = len(class_names)

print(f'Training samples: {dataset_sizes["train"]}')
print(f'Validation samples: {dataset_sizes["validation"]}')
print(f'Number of classes: {num_classes}')
print(f'Classes: {class_names[:5]}...')  # Show first 5 classes

# Use a pre-trained ResNet18 model (smaller than ResNet50)
model = models.resnet18(pretrained=True)

# Freeze early layers
for param in model.parameters():
    param.requires_grad = False

# Replace the final layer
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, num_classes)

# Only the final layer parameters require gradients
model = model.to(device)

# Loss function and optimizer (only optimize the final layer)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.fc.parameters(), lr=learning_rate)
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.1)

# Training function
def train_model(model, criterion, optimizer, scheduler, num_epochs=5):
    since = time.time()
    
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0
    
    for epoch in range(num_epochs):
        print(f'Epoch {epoch+1}/{num_epochs}')
        print('-' * 10)
        
        # Each epoch has a training and validation phase
        for phase in ['train', 'validation']:
            if phase == 'train':
                model.train()  # Set model to training mode
            else:
                model.eval()   # Set model to evaluate mode
            
            running_loss = 0.0
            running_corrects = 0
            batch_count = 0
            
            # Iterate over data
            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)
                
                # Zero the parameter gradients
                optimizer.zero_grad()
                
                # Forward pass
                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)
                    
                    # Backward pass + optimize only if in training phase
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()
                
                # Statistics
                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                
                batch_count += 1
                if batch_count % 100 == 0:
                    print(f'  Batch {batch_count}: Loss: {loss.item():.4f}')
            
            if phase == 'train':
                scheduler.step()
            
            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]
            
            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')
            
            # Deep copy the model if it's the best so far
            if phase == 'validation' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())
                # Save best model
                torch.save(model.state_dict(), 'models/best_model_pytorch.pth')
                print(f'New best model saved with validation accuracy: {best_acc:.4f}')
        
        print()
    
    time_elapsed = time.time() - since
    print(f'Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best validation accuracy: {best_acc:.4f}')
    
    # Load best model weights
    model.load_state_dict(best_model_wts)
    return model

# Train the model
print("Starting training...")
model = train_model(model, criterion, optimizer, scheduler, num_epochs=num_epochs)

# Save final model
torch.save(model.state_dict(), 'models/plant_disease_model_pytorch.pth')

# Save class names for later use
with open('models/class_names.json', 'w') as f:
    json.dump(class_names, f)

print("Model training complete!")
print("Files saved:")
print("- models/plant_disease_model_pytorch.pth (final model)")
print("- models/best_model_pytorch.pth (best model during training)")
print("- models/class_names.json (class labels)")
