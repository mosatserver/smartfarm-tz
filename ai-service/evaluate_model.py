#!/usr/bin/env python3
"""
Model Performance Analysis and Evaluation Tools
- Confusion matrices
- Classification reports
- ROC curves and AUC scores
- Model comparison
- Per-class analysis
- Error analysis
"""

import torch
import torch.nn as nn
from torchvision import transforms, models
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report, 
    roc_curve, auc, precision_recall_curve,
    accuracy_score, precision_score, recall_score, f1_score
)
from sklearn.preprocessing import LabelBinarizer
import json
from pathlib import Path
from PIL import Image
import itertools
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

class ModelEvaluator:
    """Comprehensive model evaluation class"""
    
    def __init__(self, model_path, device='cpu'):
        self.device = torch.device(device)
        self.model = None
        self.class_names = None
        self.model_info = None
        
        # Load model
        self.load_model(model_path)
        
        # Setup transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
    def load_model(self, model_path):
        """Load trained model"""
        checkpoint = torch.load(model_path, map_location=self.device)
        self.class_names = checkpoint['class_names']
        self.model_info = checkpoint
        
        # Determine model architecture
        if 'config' in checkpoint and 'enhanced' in str(model_path).lower():
            # Enhanced model
            from train_enhanced_simple import EnhancedModel
            self.model = EnhancedModel(len(self.class_names), pretrained=False)
        else:
            # Original model
            self.model = models.resnet18()
            self.model.fc = nn.Linear(self.model.fc.in_features, len(self.class_names))
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print(f"✅ Model loaded successfully")
        print(f"📊 Classes: {len(self.class_names)}")
        print(f"🎯 Model accuracy: {checkpoint.get('val_accuracy', 'Unknown')}")
    
    def evaluate_on_dataset(self, data_loader):
        """Evaluate model on dataset"""
        all_predictions = []
        all_labels = []
        all_probabilities = []
        prediction_details = []
        
        self.model.eval()
        with torch.no_grad():
            for images, labels in data_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                
                # Get predictions
                outputs = self.model(images)
                probabilities = torch.softmax(outputs, dim=1)
                _, predicted = torch.max(outputs, 1)
                
                # Store results
                all_predictions.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                all_probabilities.extend(probabilities.cpu().numpy())
                
                # Store detailed predictions
                for i in range(len(images)):
                    prediction_details.append({
                        'true_label': labels[i].item(),
                        'predicted_label': predicted[i].item(),
                        'confidence': probabilities[i][predicted[i]].item(),
                        'all_probabilities': probabilities[i].cpu().numpy()
                    })
        
        return np.array(all_predictions), np.array(all_labels), np.array(all_probabilities), prediction_details
    
    def create_confusion_matrix(self, y_true, y_pred, save_path=None, title="Confusion Matrix"):
        """Create and visualize confusion matrix"""
        cm = confusion_matrix(y_true, y_pred)
        
        # Calculate percentages
        cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100
        
        # Create figure
        fig, axes = plt.subplots(1, 2, figsize=(20, 8))
        
        # Raw counts
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=[name.replace('___', '\n') for name in self.class_names],
                   yticklabels=[name.replace('___', '\n') for name in self.class_names],
                   ax=axes[0])
        axes[0].set_title(f'{title} - Raw Counts')
        axes[0].set_xlabel('Predicted Label')
        axes[0].set_ylabel('True Label')
        axes[0].tick_params(axis='both', labelsize=8)
        
        # Percentages
        sns.heatmap(cm_percent, annot=True, fmt='.1f', cmap='Blues',
                   xticklabels=[name.replace('___', '\n') for name in self.class_names],
                   yticklabels=[name.replace('___', '\n') for name in self.class_names],
                   ax=axes[1])
        axes[1].set_title(f'{title} - Percentages')
        axes[1].set_xlabel('Predicted Label')
        axes[1].set_ylabel('True Label')
        axes[1].tick_params(axis='both', labelsize=8)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📊 Confusion matrix saved to {save_path}")
        
        plt.close()
        
        return cm, cm_percent
    
    def generate_classification_report(self, y_true, y_pred, save_path=None):
        """Generate detailed classification report"""
        # Calculate metrics
        accuracy = accuracy_score(y_true, y_pred)
        
        # Per-class metrics
        report = classification_report(
            y_true, y_pred, 
            target_names=self.class_names, 
            output_dict=True
        )
        
        # Convert to DataFrame for better visualization
        df_report = pd.DataFrame(report).transpose()
        
        # Save detailed report
        if save_path:
            # Create comprehensive report
            with open(save_path, 'w') as f:
                f.write(f"Model Performance Analysis Report\n")
                f.write(f"{'='*50}\n\n")
                f.write(f"Overall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)\n\n")
                f.write(f"Per-Class Metrics:\n")
                f.write(f"{'-'*50}\n")
                f.write(df_report.to_string())
                f.write(f"\n\n")
                
                # Add class-wise analysis
                f.write("Class-wise Analysis:\n")
                f.write(f"{'-'*50}\n")
                for i, class_name in enumerate(self.class_names):
                    class_mask = (y_true == i)
                    class_accuracy = accuracy_score(y_true[class_mask], y_pred[class_mask]) if class_mask.sum() > 0 else 0
                    f.write(f"{class_name}:\n")
                    f.write(f"  Samples: {class_mask.sum()}\n")
                    f.write(f"  Accuracy: {class_accuracy:.4f}\n")
                    f.write(f"  Precision: {df_report.loc[class_name, 'precision']:.4f}\n")
                    f.write(f"  Recall: {df_report.loc[class_name, 'recall']:.4f}\n")
                    f.write(f"  F1-Score: {df_report.loc[class_name, 'f1-score']:.4f}\n\n")
            
            print(f"📋 Classification report saved to {save_path}")
        
        return df_report
    
    def analyze_errors(self, y_true, y_pred, y_proba, prediction_details, save_path=None):
        """Analyze prediction errors in detail"""
        # Find misclassified samples
        errors = []
        for i, detail in enumerate(prediction_details):
            if detail['true_label'] != detail['predicted_label']:
                errors.append({
                    'sample_idx': i,
                    'true_class': self.class_names[detail['true_label']],
                    'predicted_class': self.class_names[detail['predicted_label']],
                    'confidence': detail['confidence'],
                    'true_label_prob': detail['all_probabilities'][detail['true_label']]
                })
        
        # Error statistics
        error_stats = {
            'total_samples': len(prediction_details),
            'total_errors': len(errors),
            'error_rate': len(errors) / len(prediction_details) * 100,
            'high_confidence_errors': len([e for e in errors if e['confidence'] > 0.8]),
            'low_confidence_errors': len([e for e in errors if e['confidence'] < 0.5])
        }
        
        # Most confused classes
        confusion_pairs = defaultdict(int)
        for error in errors:
            pair = (error['true_class'], error['predicted_class'])
            confusion_pairs[pair] += 1
        
        # Sort by frequency
        top_confusions = sorted(confusion_pairs.items(), key=lambda x: x[1], reverse=True)[:10]
        
        if save_path:
            with open(save_path, 'w') as f:
                f.write("Error Analysis Report\n")
                f.write("="*50 + "\n\n")
                
                f.write("Error Statistics:\n")
                f.write("-"*20 + "\n")
                f.write(f"Total Samples: {error_stats['total_samples']}\n")
                f.write(f"Total Errors: {error_stats['total_errors']}\n")
                f.write(f"Error Rate: {error_stats['error_rate']:.2f}%\n")
                f.write(f"High Confidence Errors (>80%): {error_stats['high_confidence_errors']}\n")
                f.write(f"Low Confidence Errors (<50%): {error_stats['low_confidence_errors']}\n\n")
                
                f.write("Most Confused Class Pairs:\n")
                f.write("-"*30 + "\n")
                for i, ((true_class, pred_class), count) in enumerate(top_confusions):
                    f.write(f"{i+1:2d}. {true_class} → {pred_class}: {count} errors\n")
            
            print(f"🔍 Error analysis saved to {save_path}")
        
        return errors, error_stats, top_confusions
    
    def plot_per_class_metrics(self, df_report, save_path=None):
        """Plot per-class performance metrics"""
        # Filter out macro/micro/weighted averages
        class_metrics = df_report[df_report.index.isin(self.class_names)]
        
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        
        # Precision
        class_metrics['precision'].plot(kind='bar', ax=axes[0,0], color='skyblue')
        axes[0,0].set_title('Precision by Class')
        axes[0,0].set_ylabel('Precision')
        axes[0,0].tick_params(axis='x', rotation=45)
        axes[0,0].grid(True, alpha=0.3)
        
        # Recall
        class_metrics['recall'].plot(kind='bar', ax=axes[0,1], color='lightcoral')
        axes[0,1].set_title('Recall by Class')
        axes[0,1].set_ylabel('Recall')
        axes[0,1].tick_params(axis='x', rotation=45)
        axes[0,1].grid(True, alpha=0.3)
        
        # F1-Score
        class_metrics['f1-score'].plot(kind='bar', ax=axes[1,0], color='lightgreen')
        axes[1,0].set_title('F1-Score by Class')
        axes[1,0].set_ylabel('F1-Score')
        axes[1,0].tick_params(axis='x', rotation=45)
        axes[1,0].grid(True, alpha=0.3)
        
        # Support
        class_metrics['support'].plot(kind='bar', ax=axes[1,1], color='gold')
        axes[1,1].set_title('Support (Number of Samples) by Class')
        axes[1,1].set_ylabel('Number of Samples')
        axes[1,1].tick_params(axis='x', rotation=45)
        axes[1,1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📊 Per-class metrics plot saved to {save_path}")
        
        plt.close()
    
    def create_roc_curves(self, y_true, y_proba, save_path=None):
        """Create ROC curves for multi-class classification"""
        # Binarize labels
        lb = LabelBinarizer()
        y_true_bin = lb.fit_transform(y_true)
        
        # If binary classification, expand to 2D
        if y_true_bin.shape[1] == 1:
            y_true_bin = np.hstack([1 - y_true_bin, y_true_bin])
        
        fig, axes = plt.subplots(1, 2, figsize=(16, 6))
        
        # Individual ROC curves
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.class_names)))
        
        for i, (class_name, color) in enumerate(zip(self.class_names, colors)):
            if i < y_true_bin.shape[1]:  # Ensure we don't exceed available classes
                fpr, tpr, _ = roc_curve(y_true_bin[:, i], y_proba[:, i])
                roc_auc = auc(fpr, tpr)
                
                axes[0].plot(fpr, tpr, color=color, lw=1.5,
                           label=f'{class_name.split("___")[-1]} (AUC = {roc_auc:.3f})')
        
        axes[0].plot([0, 1], [0, 1], 'k--', lw=1)
        axes[0].set_xlim([0.0, 1.0])
        axes[0].set_ylim([0.0, 1.05])
        axes[0].set_xlabel('False Positive Rate')
        axes[0].set_ylabel('True Positive Rate')
        axes[0].set_title('ROC Curves by Class')
        axes[0].legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        axes[0].grid(True, alpha=0.3)
        
        # Macro-average ROC curve
        all_fpr = np.unique(np.concatenate([roc_curve(y_true_bin[:, i], y_proba[:, i])[0] 
                                          for i in range(min(len(self.class_names), y_true_bin.shape[1]))]))
        mean_tpr = np.zeros_like(all_fpr)
        
        for i in range(min(len(self.class_names), y_true_bin.shape[1])):
            fpr, tpr, _ = roc_curve(y_true_bin[:, i], y_proba[:, i])
            mean_tpr += np.interp(all_fpr, fpr, tpr)
        
        mean_tpr /= min(len(self.class_names), y_true_bin.shape[1])
        macro_auc = auc(all_fpr, mean_tpr)
        
        axes[1].plot(all_fpr, mean_tpr, color='navy', lw=3,
                    label=f'Macro-average ROC (AUC = {macro_auc:.3f})')
        axes[1].plot([0, 1], [0, 1], 'k--', lw=1)
        axes[1].set_xlim([0.0, 1.0])
        axes[1].set_ylim([0.0, 1.05])
        axes[1].set_xlabel('False Positive Rate')
        axes[1].set_ylabel('True Positive Rate')
        axes[1].set_title('Macro-average ROC Curve')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📈 ROC curves saved to {save_path}")
        
        plt.close()
        
        return macro_auc
    
    def comprehensive_evaluation(self, data_loader, output_dir='evaluation_results'):
        """Run comprehensive model evaluation"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        print("🔍 Starting comprehensive model evaluation...")
        
        # Get predictions
        y_pred, y_true, y_proba, prediction_details = self.evaluate_on_dataset(data_loader)
        
        # 1. Confusion Matrix
        print("📊 Generating confusion matrix...")
        cm, cm_percent = self.create_confusion_matrix(
            y_true, y_pred, 
            save_path=output_path / 'confusion_matrix.png'
        )
        
        # 2. Classification Report
        print("📋 Generating classification report...")
        df_report = self.generate_classification_report(
            y_true, y_pred,
            save_path=output_path / 'classification_report.txt'
        )
        
        # 3. Per-class Metrics Plot
        print("📊 Creating per-class metrics plot...")
        self.plot_per_class_metrics(
            df_report,
            save_path=output_path / 'per_class_metrics.png'
        )
        
        # 4. ROC Curves
        print("📈 Creating ROC curves...")
        macro_auc = self.create_roc_curves(
            y_true, y_proba,
            save_path=output_path / 'roc_curves.png'
        )
        
        # 5. Error Analysis
        print("🔍 Performing error analysis...")
        errors, error_stats, top_confusions = self.analyze_errors(
            y_true, y_pred, y_proba, prediction_details,
            save_path=output_path / 'error_analysis.txt'
        )
        
        # 6. Summary Report
        print("📝 Creating summary report...")
        overall_accuracy = accuracy_score(y_true, y_pred)
        
        summary = {
            'model_info': self.model_info.get('config', {}),
            'overall_accuracy': float(overall_accuracy),
            'macro_avg_f1': float(df_report.loc['macro avg', 'f1-score']),
            'weighted_avg_f1': float(df_report.loc['weighted avg', 'f1-score']),
            'macro_auc': float(macro_auc),
            'total_classes': len(self.class_names),
            'total_samples': len(y_true),
            'error_rate': error_stats['error_rate'],
            'best_performing_classes': df_report.nlargest(5, 'f1-score').index.tolist(),
            'worst_performing_classes': df_report.nsmallest(5, 'f1-score').index.tolist()
        }
        
        with open(output_path / 'summary_report.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("📋 EVALUATION SUMMARY")
        print("="*60)
        print(f"Overall Accuracy: {overall_accuracy:.4f} ({overall_accuracy*100:.2f}%)")
        print(f"Macro-average F1: {summary['macro_avg_f1']:.4f}")
        print(f"Weighted-average F1: {summary['weighted_avg_f1']:.4f}")
        print(f"Macro-average AUC: {summary['macro_auc']:.4f}")
        print(f"Total Classes: {summary['total_classes']}")
        print(f"Total Samples: {summary['total_samples']}")
        print(f"Error Rate: {summary['error_rate']:.2f}%")
        print(f"\n📁 All results saved to: {output_path}")
        
        return summary

def compare_models(model_paths, data_loader, output_dir='model_comparison'):
    """Compare multiple models"""
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print("🔄 Starting model comparison...")
    
    results = {}
    
    for model_path in model_paths:
        model_name = Path(model_path).stem
        print(f"\n📊 Evaluating {model_name}...")
        
        try:
            evaluator = ModelEvaluator(model_path)
            y_pred, y_true, y_proba, _ = evaluator.evaluate_on_dataset(data_loader)
            
            # Calculate metrics
            accuracy = accuracy_score(y_true, y_pred)
            precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
            
            results[model_name] = {
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'num_classes': len(evaluator.class_names)
            }
            
        except Exception as e:
            print(f"❌ Error evaluating {model_name}: {e}")
            results[model_name] = None
    
    # Create comparison plot
    if any(results.values()):
        df_comparison = pd.DataFrame({k: v for k, v in results.items() if v is not None}).T
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        metrics = ['accuracy', 'precision', 'recall', 'f1_score']
        x = np.arange(len(df_comparison.index))
        width = 0.2
        
        for i, metric in enumerate(metrics):
            ax.bar(x + i*width, df_comparison[metric], width, 
                   label=metric.replace('_', ' ').title())
        
        ax.set_xlabel('Models')
        ax.set_ylabel('Score')
        ax.set_title('Model Performance Comparison')
        ax.set_xticks(x + width * 1.5)
        ax.set_xticklabels(df_comparison.index, rotation=45)
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_path / 'model_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Save comparison results
        df_comparison.to_csv(output_path / 'comparison_results.csv')
        
        print(f"\n📊 Model comparison completed!")
        print(f"📁 Results saved to: {output_path}")
        print("\nComparison Summary:")
        print(df_comparison.round(4))

def main():
    """Main evaluation function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Model Performance Analysis')
    parser.add_argument('--model', type=str, required=True, help='Path to model file')
    parser.add_argument('--data-dir', type=str, default='../dataset/plantvillage dataset/color', help='Path to validation data')
    parser.add_argument('--output-dir', type=str, default='evaluation_results', help='Output directory')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for evaluation')
    
    args = parser.parse_args()
    
    # This would need a proper data loader setup
    # For now, just demonstrate the evaluator
    print(f"🔍 Model Evaluation Tool")
    print(f"Model: {args.model}")
    print(f"Output: {args.output_dir}")
    
    try:
        evaluator = ModelEvaluator(args.model)
        print("✅ Model loaded successfully!")
        print(f"📊 Model has {len(evaluator.class_names)} classes")
        
        # In a real scenario, you'd create a proper data loader here
        print("💡 To run full evaluation, provide a proper data loader")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
