#!/usr/bin/env python3
"""
Advanced Plant Disease Detection Model Training Script
Uses MobileNetV2 with transfer learning for better accuracy and efficiency
"""

import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import os
import json
import numpy as np
from pathlib import Path

class PlantDiseaseModel:
    def __init__(self, img_height=224, img_width=224, batch_size=32):
        self.img_height = img_height
        self.img_width = img_width
        self.batch_size = batch_size
        self.model = None
        self.class_indices = {}
        
        # Create models directory if it doesn't exist
        Path("models").mkdir(exist_ok=True)
        
    def create_model(self, num_classes):
        """Create model using MobileNetV2 with transfer learning"""
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            weights='imagenet',
            include_top=False,
            input_shape=(self.img_height, self.img_width, 3)
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Add custom classification head
        inputs = tf.keras.Input(shape=(self.img_height, self.img_width, 3))
        x = base_model(inputs, training=False)
        x = GlobalAveragePooling2D()(x)
        x = Dropout(0.2)(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.2)(x)
        outputs = Dense(num_classes, activation='softmax')(x)
        
        self.model = Model(inputs, outputs)
        
        # Compile model
        self.model.compile(
            optimizer=Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return self.model
    
    def prepare_data(self, train_dir, validation_dir=None):
        """Prepare training and validation data with augmentation"""
        
        # Enhanced data augmentation for better generalization
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=30,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            brightness_range=[0.8, 1.2],
            fill_mode='nearest',
            validation_split=0.2 if validation_dir is None else 0.0
        )
        
        # Validation data generator
        validation_datagen = ImageDataGenerator(rescale=1./255)
        
        # Create training generator
        if validation_dir is None:
            train_generator = train_datagen.flow_from_directory(
                train_dir,
                target_size=(self.img_height, self.img_width),
                batch_size=self.batch_size,
                class_mode='categorical',
                subset='training'
            )
            
            validation_generator = train_datagen.flow_from_directory(
                train_dir,
                target_size=(self.img_height, self.img_width),
                batch_size=self.batch_size,
                class_mode='categorical',
                subset='validation'
            )
        else:
            train_generator = train_datagen.flow_from_directory(
                train_dir,
                target_size=(self.img_height, self.img_width),
                batch_size=self.batch_size,
                class_mode='categorical'
            )
            
            validation_generator = validation_datagen.flow_from_directory(
                validation_dir,
                target_size=(self.img_height, self.img_width),
                batch_size=self.batch_size,
                class_mode='categorical'
            )
        
        # Store class indices for later use
        self.class_indices = train_generator.class_indices
        
        return train_generator, validation_generator
    
    def train(self, train_generator, validation_generator, epochs=50):
        """Train the model with callbacks for better performance"""
        
        # Define callbacks
        callbacks = [
            ModelCheckpoint(
                filepath='models/best_plant_disease_model.h5',
                save_best_only=True,
                monitor='val_accuracy',
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_accuracy',
                patience=7,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        # Train the model
        history = self.model.fit(
            train_generator,
            epochs=epochs,
            validation_data=validation_generator,
            callbacks=callbacks,
            verbose=1
        )
        
        return history
    
    def fine_tune(self, train_generator, validation_generator, epochs=10):
        """Fine-tune the model by unfreezing some layers"""
        
        # Unfreeze the base model
        self.model.layers[1].trainable = True
        
        # Fine-tune from this layer onwards
        fine_tune_at = 100
        
        # Freeze all the layers before fine_tune_at
        for layer in self.model.layers[1].layers[:fine_tune_at]:
            layer.trainable = False
        
        # Compile with lower learning rate
        self.model.compile(
            optimizer=Adam(learning_rate=0.0001/10),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Define callbacks for fine-tuning
        callbacks = [
            ModelCheckpoint(
                filepath='models/fine_tuned_plant_disease_model.h5',
                save_best_only=True,
                monitor='val_accuracy',
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_accuracy',
                patience=5,
                restore_best_weights=True,
                verbose=1
            )
        ]
        
        # Continue training
        history = self.model.fit(
            train_generator,
            epochs=epochs,
            validation_data=validation_generator,
            callbacks=callbacks,
            verbose=1
        )
        
        return history
    
    def save_model_and_classes(self, model_path='models/plant_disease_model.h5'):
        """Save the final model and class indices"""
        
        # Save the model
        self.model.save(model_path)
        
        # Save class indices
        with open('models/class_indices.json', 'w') as f:
            json.dump(self.class_indices, f, indent=2)
        
        # Create reverse mapping (id to class name)
        id_to_class = {v: k for k, v in self.class_indices.items()}
        with open('models/id_to_class.json', 'w') as f:
            json.dump(id_to_class, f, indent=2)
        
        print(f"Model saved to {model_path}")
        print("Class indices saved to models/class_indices.json")
        print("ID to class mapping saved to models/id_to_class.json")
    
    def evaluate_model(self, test_generator):
        """Evaluate the model on test data"""
        if self.model is None:
            print("Model not trained yet!")
            return None
        
        # Evaluate
        test_loss, test_accuracy = self.model.evaluate(test_generator, verbose=1)
        print(f"Test Accuracy: {test_accuracy:.4f}")
        print(f"Test Loss: {test_loss:.4f}")
        
        return test_accuracy, test_loss

def main():
    """Main training function"""
    
    # Initialize model
    model_trainer = PlantDiseaseModel()
    
    # Dataset paths (update these paths according to your dataset structure)
    train_dir = "dataset/train"  # Update this path
    validation_dir = "dataset/validation"  # Update this path or set to None
    
    # Check if dataset exists
    if not os.path.exists(train_dir):
        print(f"Training directory {train_dir} not found!")
        print("Please download the PlantVillage dataset and organize it as:")
        print("dataset/")
        print("  train/")
        print("    class1/")
        print("    class2/")
        print("    ...")
        print("  validation/")
        print("    class1/")
        print("    class2/")
        print("    ...")
        return
    
    # Prepare data
    print("Preparing data...")
    train_gen, val_gen = model_trainer.prepare_data(train_dir, validation_dir)
    
    # Get number of classes
    num_classes = len(train_gen.class_indices)
    print(f"Number of classes: {num_classes}")
    print(f"Classes: {list(train_gen.class_indices.keys())}")
    
    # Create model
    print("Creating model...")
    model_trainer.create_model(num_classes)
    
    # Print model summary
    model_trainer.model.summary()
    
    # Train model
    print("Starting initial training...")
    history1 = model_trainer.train(train_gen, val_gen, epochs=20)
    
    # Fine-tune model
    print("Starting fine-tuning...")
    history2 = model_trainer.fine_tune(train_gen, val_gen, epochs=10)
    
    # Save final model
    model_trainer.save_model_and_classes()
    
    print("Training completed successfully!")
    print("Model files saved:")
    print("- models/plant_disease_model.h5")
    print("- models/class_indices.json")
    print("- models/id_to_class.json")

if __name__ == "__main__":
    main()
