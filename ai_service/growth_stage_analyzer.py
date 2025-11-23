#!/usr/bin/env python3
"""
Advanced Growth Stage Analysis System
Provides crop lifecycle monitoring, seasonal pattern analysis, and growth stage prediction
"""

import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
import json
import cv2
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, List, Tuple, Optional
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GrowthStageClassifier(nn.Module):
    """Neural network for growth stage classification"""
    
    def __init__(self, num_classes=6):
        super(GrowthStageClassifier, self).__init__()
        # Use ResNet18 as backbone
        from torchvision.models import resnet18
        self.backbone = resnet18(pretrained=True)
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )
        
    def forward(self, x):
        return self.backbone(x)

class SeasonalPatternAnalyzer:
    """Analyzes seasonal patterns and their impact on crop growth"""
    
    def __init__(self):
        self.seasonal_data = self._load_seasonal_patterns()
        
    def _load_seasonal_patterns(self) -> Dict:
        """Load seasonal pattern data for Tanzania"""
        return {
            'dry_season': {
                'months': [6, 7, 8, 9, 10],
                'characteristics': {
                    'temperature_range': (20, 30),
                    'humidity_range': (30, 60),
                    'rainfall_range': (0, 50),
                    'disease_risk': 'low_to_moderate',
                    'growth_factors': ['water_stress', 'nutrient_concentration']
                }
            },
            'wet_season': {
                'months': [11, 12, 1, 2, 3, 4, 5],
                'characteristics': {
                    'temperature_range': (22, 28),
                    'humidity_range': (60, 95),
                    'rainfall_range': (100, 500),
                    'disease_risk': 'high',
                    'growth_factors': ['fungal_diseases', 'rapid_growth', 'pest_activity']
                }
            },
            'transition_periods': {
                'months': [5, 10],
                'characteristics': {
                    'temperature_range': (21, 29),
                    'humidity_range': (45, 75),
                    'rainfall_range': (50, 150),
                    'disease_risk': 'moderate',
                    'growth_factors': ['climate_adaptation', 'stress_recovery']
                }
            }
        }
    
    def analyze_seasonal_impact(self, current_date: datetime, 
                              environmental_data: Dict) -> Dict:
        """Analyze seasonal impact on crop growth and disease risk"""
        current_month = current_date.month
        
        # Determine current season
        season = self._determine_season(current_month)
        season_data = self.seasonal_data[season]
        
        # Analyze environmental alignment with seasonal expectations
        alignment_score = self._calculate_seasonal_alignment(
            environmental_data, season_data['characteristics']
        )
        
        # Generate seasonal recommendations
        recommendations = self._generate_seasonal_recommendations(
            season, alignment_score, environmental_data
        )
        
        return {
            'current_season': season,
            'season_characteristics': season_data,
            'alignment_score': alignment_score,
            'recommendations': recommendations,
            'risk_factors': self._assess_seasonal_risks(season, environmental_data),
            'optimal_activities': self._get_seasonal_activities(season, current_month)
        }
    
    def _determine_season(self, month: int) -> str:
        """Determine current season based on month"""
        if month in self.seasonal_data['dry_season']['months']:
            return 'dry_season'
        elif month in self.seasonal_data['wet_season']['months']:
            return 'wet_season'
        else:
            return 'transition_periods'
    
    def _calculate_seasonal_alignment(self, env_data: Dict, expected: Dict) -> float:
        """Calculate how well current conditions align with seasonal expectations"""
        score = 0.0
        factors = 0
        
        # Temperature alignment
        if 'temperature' in env_data:
            temp = float(env_data['temperature'])
            temp_range = expected['temperature_range']
            if temp_range[0] <= temp <= temp_range[1]:
                score += 1.0
            else:
                deviation = min(abs(temp - temp_range[0]), abs(temp - temp_range[1]))
                score += max(0, 1.0 - deviation / 10.0)
            factors += 1
        
        # Humidity alignment
        if 'humidity' in env_data:
            humidity = float(env_data['humidity'])
            hum_range = expected['humidity_range']
            if hum_range[0] <= humidity <= hum_range[1]:
                score += 1.0
            else:
                deviation = min(abs(humidity - hum_range[0]), abs(humidity - hum_range[1]))
                score += max(0, 1.0 - deviation / 20.0)
            factors += 1
        
        # Rainfall alignment
        if 'rainfall' in env_data:
            rainfall = float(env_data['rainfall'])
            rain_range = expected['rainfall_range']
            if rain_range[0] <= rainfall <= rain_range[1]:
                score += 1.0
            else:
                deviation = min(abs(rainfall - rain_range[0]), abs(rainfall - rain_range[1]))
                score += max(0, 1.0 - deviation / 50.0)
            factors += 1
        
        return score / max(factors, 1)
    
    def _generate_seasonal_recommendations(self, season: str, alignment: float, 
                                         env_data: Dict) -> List[str]:
        """Generate recommendations based on seasonal analysis"""
        recommendations = []
        
        if season == 'dry_season':
            if alignment < 0.6:
                recommendations.extend([
                    "Consider irrigation to supplement low rainfall",
                    "Monitor for water stress symptoms in plants",
                    "Apply mulching to conserve soil moisture"
                ])
            recommendations.extend([
                "Focus on pest control as pest activity may increase",
                "Harvest mature crops before extreme dry conditions",
                "Prepare for next planting season"
            ])
            
        elif season == 'wet_season':
            if alignment < 0.6:
                recommendations.extend([
                    "Improve drainage to prevent waterlogging",
                    "Monitor for fungal diseases due to high humidity",
                    "Adjust fertilizer application for heavy rainfall"
                ])
            recommendations.extend([
                "Increase disease monitoring frequency",
                "Apply preventive fungicide treatments",
                "Ensure good air circulation around plants"
            ])
            
        else:  # transition_periods
            recommendations.extend([
                "Prepare crops for seasonal transition",
                "Adjust management practices gradually",
                "Monitor weather patterns closely"
            ])
        
        return recommendations
    
    def _assess_seasonal_risks(self, season: str, env_data: Dict) -> List[Dict]:
        """Assess season-specific risks"""
        risks = []
        
        season_data = self.seasonal_data[season]
        risk_level = season_data['characteristics']['disease_risk']
        
        base_risks = {
            'dry_season': [
                {'risk': 'Drought stress', 'probability': 0.6, 'impact': 'high'},
                {'risk': 'Nutrient deficiency', 'probability': 0.4, 'impact': 'moderate'},
                {'risk': 'Pest infestation', 'probability': 0.5, 'impact': 'moderate'}
            ],
            'wet_season': [
                {'risk': 'Fungal diseases', 'probability': 0.8, 'impact': 'high'},
                {'risk': 'Waterlogging', 'probability': 0.6, 'impact': 'high'},
                {'risk': 'Bacterial infections', 'probability': 0.7, 'impact': 'moderate'}
            ],
            'transition_periods': [
                {'risk': 'Climate stress', 'probability': 0.5, 'impact': 'moderate'},
                {'risk': 'Adaptation challenges', 'probability': 0.4, 'impact': 'low'}
            ]
        }
        
        return base_risks.get(season, [])
    
    def _get_seasonal_activities(self, season: str, month: int) -> List[str]:
        """Get recommended activities for the current season"""
        activities = {
            'dry_season': [
                "Land preparation for next season",
                "Irrigation system maintenance",
                "Crop harvesting and storage",
                "Soil fertility management"
            ],
            'wet_season': [
                "Planting and transplanting",
                "Disease and pest monitoring",
                "Fertilizer application",
                "Weed management"
            ],
            'transition_periods': [
                "Soil testing and preparation",
                "Equipment maintenance",
                "Planning next season activities",
                "Market preparation"
            ]
        }
        
        return activities.get(season, [])

class GrowthStageAnalyzer:
    """Main growth stage analysis system"""
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.seasonal_analyzer = SeasonalPatternAnalyzer()
        self.growth_stages = [
            'germination', 'seedling', 'vegetative', 
            'flowering', 'fruiting', 'maturity'
        ]
        
        # Load or create model
        self._initialize_model()
        
        # Growth stage characteristics
        self.stage_characteristics = self._load_stage_characteristics()
    
    def _initialize_model(self):
        """Initialize or load the growth stage classification model"""
        model_path = Path('models/growth_stage_model.pth')
        
        self.model = GrowthStageClassifier(num_classes=len(self.growth_stages))
        
        if model_path.exists():
            try:
                checkpoint = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                logger.info("Loaded existing growth stage model")
            except Exception as e:
                logger.warning(f"Failed to load growth stage model: {e}")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Preprocessing pipeline
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])
    
    def _load_stage_characteristics(self) -> Dict:
        """Load growth stage characteristics and requirements"""
        return {
            'germination': {
                'duration_days': (5, 14),
                'temperature_optimal': (20, 30),
                'humidity_optimal': (70, 85),
                'water_needs': 'high',
                'nutrients': ['phosphorus', 'potassium'],
                'common_issues': ['damping_off', 'poor_germination', 'seed_rot'],
                'monitoring_points': ['emergence_rate', 'seedling_vigor']
            },
            'seedling': {
                'duration_days': (14, 35),
                'temperature_optimal': (18, 28),
                'humidity_optimal': (60, 80),
                'water_needs': 'moderate_to_high',
                'nutrients': ['nitrogen', 'phosphorus'],
                'common_issues': ['transplant_shock', 'pest_damage', 'nutrient_deficiency'],
                'monitoring_points': ['leaf_development', 'root_establishment', 'growth_rate']
            },
            'vegetative': {
                'duration_days': (35, 70),
                'temperature_optimal': (20, 30),
                'humidity_optimal': (50, 75),
                'water_needs': 'high',
                'nutrients': ['nitrogen', 'potassium', 'magnesium'],
                'common_issues': ['nitrogen_deficiency', 'pest_infestation', 'disease_susceptibility'],
                'monitoring_points': ['leaf_area_index', 'stem_diameter', 'branching_pattern']
            },
            'flowering': {
                'duration_days': (70, 100),
                'temperature_optimal': (22, 28),
                'humidity_optimal': (55, 70),
                'water_needs': 'moderate',
                'nutrients': ['phosphorus', 'potassium', 'calcium'],
                'common_issues': ['flower_drop', 'poor_pollination', 'blossom_end_rot'],
                'monitoring_points': ['flower_count', 'pollination_success', 'fruit_set']
            },
            'fruiting': {
                'duration_days': (100, 140),
                'temperature_optimal': (20, 28),
                'humidity_optimal': (50, 70),
                'water_needs': 'moderate_to_high',
                'nutrients': ['potassium', 'calcium', 'magnesium'],
                'common_issues': ['fruit_cracking', 'pest_damage', 'uneven_ripening'],
                'monitoring_points': ['fruit_size', 'color_development', 'sugar_content']
            },
            'maturity': {
                'duration_days': (140, 180),
                'temperature_optimal': (18, 26),
                'humidity_optimal': (45, 65),
                'water_needs': 'low_to_moderate',
                'nutrients': ['minimal_feeding'],
                'common_issues': ['over_ripening', 'storage_diseases', 'quality_loss'],
                'monitoring_points': ['harvest_indicators', 'storage_quality', 'market_readiness']
            }
        }
    
    def analyze_growth_stage(self, image_path: str, environmental_data: Dict,
                           planting_date: Optional[str] = None) -> Dict:
        """Comprehensive growth stage analysis"""
        try:
            # Load and preprocess image
            image = Image.open(image_path).convert('RGB')
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Predict growth stage
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                predicted_stage_idx = torch.argmax(probabilities, dim=1).item()
                confidence = probabilities[0][predicted_stage_idx].item()
            
            predicted_stage = self.growth_stages[predicted_stage_idx]
            
            # Analyze stage characteristics
            stage_analysis = self._analyze_stage_characteristics(
                predicted_stage, environmental_data, confidence
            )
            
            # Seasonal analysis
            current_date = datetime.now()
            seasonal_analysis = self.seasonal_analyzer.analyze_seasonal_impact(
                current_date, environmental_data
            )
            
            # Planting date analysis
            planting_analysis = None
            if planting_date:
                planting_analysis = self._analyze_planting_timeline(
                    planting_date, predicted_stage, current_date
                )
            
            # Generate comprehensive recommendations
            recommendations = self._generate_comprehensive_recommendations(
                predicted_stage, stage_analysis, seasonal_analysis, 
                environmental_data, planting_analysis
            )
            
            # Advanced morphological analysis
            morphological_analysis = self._analyze_plant_morphology(image_path)
            
            return {
                'growth_stage': {
                    'predicted_stage': predicted_stage,
                    'confidence': confidence,
                    'stage_index': predicted_stage_idx,
                    'all_probabilities': {
                        stage: prob.item() for stage, prob in 
                        zip(self.growth_stages, probabilities[0])
                    }
                },
                'stage_analysis': stage_analysis,
                'seasonal_analysis': seasonal_analysis,
                'planting_analysis': planting_analysis,
                'morphological_analysis': morphological_analysis,
                'recommendations': recommendations,
                'next_stage_predictions': self._predict_next_stage_timing(
                    predicted_stage, environmental_data, planting_date
                ),
                'health_indicators': self._assess_stage_health(
                    predicted_stage, environmental_data, morphological_analysis
                )
            }
            
        except Exception as e:
            logger.error(f"Growth stage analysis failed: {e}")
            return {
                'error': str(e),
                'growth_stage': {'predicted_stage': 'unknown', 'confidence': 0.0}
            }
    
    def _analyze_stage_characteristics(self, stage: str, env_data: Dict, 
                                     confidence: float) -> Dict:
        """Analyze current stage characteristics and requirements"""
        stage_info = self.stage_characteristics[stage]
        
        # Assess environmental suitability
        env_suitability = self._assess_environmental_suitability(stage, env_data)
        
        # Calculate stage progress
        stage_progress = self._estimate_stage_progress(stage, env_data)
        
        return {
            'stage_info': stage_info,
            'environmental_suitability': env_suitability,
            'stage_progress': stage_progress,
            'confidence_assessment': {
                'prediction_confidence': confidence,
                'reliability': 'high' if confidence > 0.8 else 'moderate' if confidence > 0.6 else 'low'
            },
            'critical_factors': self._identify_critical_factors(stage, env_data)
        }
    
    def _assess_environmental_suitability(self, stage: str, env_data: Dict) -> Dict:
        """Assess how suitable current environment is for the growth stage"""
        stage_req = self.stage_characteristics[stage]
        suitability = {}
        
        # Temperature suitability
        if 'temperature' in env_data:
            temp = float(env_data['temperature'])
            temp_range = stage_req['temperature_optimal']
            if temp_range[0] <= temp <= temp_range[1]:
                suitability['temperature'] = {'score': 1.0, 'status': 'optimal'}
            else:
                deviation = min(abs(temp - temp_range[0]), abs(temp - temp_range[1]))
                score = max(0, 1.0 - deviation / 10.0)
                status = 'suboptimal' if score > 0.5 else 'poor'
                suitability['temperature'] = {'score': score, 'status': status}
        
        # Humidity suitability
        if 'humidity' in env_data:
            humidity = float(env_data['humidity'])
            humidity_range = stage_req['humidity_optimal']
            if humidity_range[0] <= humidity <= humidity_range[1]:
                suitability['humidity'] = {'score': 1.0, 'status': 'optimal'}
            else:
                deviation = min(abs(humidity - humidity_range[0]), abs(humidity - humidity_range[1]))
                score = max(0, 1.0 - deviation / 20.0)
                status = 'suboptimal' if score > 0.5 else 'poor'
                suitability['humidity'] = {'score': score, 'status': status}
        
        # Calculate overall suitability
        scores = [s['score'] for s in suitability.values()]
        overall_score = sum(scores) / len(scores) if scores else 0.5
        
        suitability['overall'] = {
            'score': overall_score,
            'status': 'optimal' if overall_score > 0.8 else 
                     'good' if overall_score > 0.6 else 
                     'suboptimal' if overall_score > 0.4 else 'poor'
        }
        
        return suitability
    
    def _analyze_plant_morphology(self, image_path: str) -> Dict:
        """Analyze plant morphological features"""
        try:
            # Load image
            image = cv2.imread(image_path)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Basic morphological analysis
            morphology = {
                'leaf_analysis': self._analyze_leaves(image_rgb),
                'stem_analysis': self._analyze_stem(image_rgb),
                'overall_health': self._assess_visual_health(image_rgb),
                'color_analysis': self._analyze_plant_colors(image_rgb)
            }
            
            return morphology
            
        except Exception as e:
            logger.error(f"Morphological analysis failed: {e}")
            return {'error': str(e)}
    
    def _analyze_leaves(self, image: np.ndarray) -> Dict:
        """Analyze leaf characteristics"""
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        
        # Define green color range for leaves
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        
        # Create mask for green areas (leaves)
        leaf_mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Calculate leaf area percentage
        total_pixels = image.shape[0] * image.shape[1]
        leaf_pixels = np.sum(leaf_mask > 0)
        leaf_coverage = leaf_pixels / total_pixels
        
        # Analyze leaf color health
        green_channel = image[:, :, 1][leaf_mask > 0]
        avg_green_intensity = np.mean(green_channel) if len(green_channel) > 0 else 0
        
        return {
            'leaf_coverage_percentage': float(leaf_coverage * 100),
            'average_green_intensity': float(avg_green_intensity),
            'health_status': 'healthy' if avg_green_intensity > 150 else 
                           'moderate' if avg_green_intensity > 100 else 'poor'
        }
    
    def _analyze_stem(self, image: np.ndarray) -> Dict:
        """Analyze stem characteristics"""
        # This is a simplified stem analysis
        # In practice, you'd use more sophisticated image processing
        
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Count edge pixels as a proxy for stem structure
        edge_density = np.sum(edges > 0) / (image.shape[0] * image.shape[1])
        
        return {
            'structural_complexity': float(edge_density),
            'estimated_vigor': 'high' if edge_density > 0.1 else 
                             'moderate' if edge_density > 0.05 else 'low'
        }
    
    def _assess_visual_health(self, image: np.ndarray) -> Dict:
        """Assess overall visual health indicators"""
        # Calculate color diversity as health indicator
        colors = image.reshape(-1, 3)
        color_std = np.std(colors, axis=0)
        color_diversity = np.mean(color_std)
        
        # Calculate brightness
        brightness = np.mean(image)
        
        return {
            'color_diversity': float(color_diversity),
            'brightness': float(brightness),
            'visual_health_score': float(min(1.0, (color_diversity + brightness/255) / 2))
        }
    
    def _analyze_plant_colors(self, image: np.ndarray) -> Dict:
        """Analyze plant color composition"""
        # Convert to different color spaces for analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        
        # Analyze color distribution
        colors = image.reshape(-1, 3)
        
        return {
            'dominant_colors': self._get_dominant_colors(colors),
            'color_health_indicators': self._assess_color_health(hsv)
        }
    
    def _get_dominant_colors(self, colors: np.ndarray, k: int = 3) -> List[Dict]:
        """Get dominant colors in the image"""
        from sklearn.cluster import KMeans
        
        try:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(colors)
            
            dominant_colors = []
            for i, color in enumerate(kmeans.cluster_centers_):
                percentage = np.sum(kmeans.labels_ == i) / len(kmeans.labels_)
                dominant_colors.append({
                    'color_rgb': color.astype(int).tolist(),
                    'percentage': float(percentage * 100)
                })
            
            return sorted(dominant_colors, key=lambda x: x['percentage'], reverse=True)
        
        except Exception as e:
            logger.error(f"Dominant color analysis failed: {e}")
            return []
    
    def _assess_color_health(self, hsv_image: np.ndarray) -> Dict:
        """Assess plant health based on color analysis"""
        # Define healthy green range
        healthy_green_lower = np.array([35, 50, 50])
        healthy_green_upper = np.array([85, 255, 255])
        
        # Calculate healthy green percentage
        healthy_mask = cv2.inRange(hsv_image, healthy_green_lower, healthy_green_upper)
        healthy_percentage = np.sum(healthy_mask > 0) / (hsv_image.shape[0] * hsv_image.shape[1])
        
        # Define stress indicators (yellow/brown colors)
        stress_lower = np.array([15, 50, 50])
        stress_upper = np.array([35, 255, 255])
        stress_mask = cv2.inRange(hsv_image, stress_lower, stress_upper)
        stress_percentage = np.sum(stress_mask > 0) / (hsv_image.shape[0] * hsv_image.shape[1])
        
        return {
            'healthy_green_percentage': float(healthy_percentage * 100),
            'stress_indicator_percentage': float(stress_percentage * 100),
            'color_health_status': 'healthy' if healthy_percentage > 0.6 else 
                                 'moderate' if healthy_percentage > 0.3 else 'concerning'
        }
    
    def _generate_comprehensive_recommendations(self, stage: str, stage_analysis: Dict,
                                              seasonal_analysis: Dict, env_data: Dict,
                                              planting_analysis: Optional[Dict]) -> List[Dict]:
        """Generate comprehensive recommendations based on all analyses"""
        recommendations = []
        
        # Stage-specific recommendations
        stage_recs = self._get_stage_recommendations(stage, stage_analysis)
        recommendations.extend(stage_recs)
        
        # Seasonal recommendations
        seasonal_recs = seasonal_analysis.get('recommendations', [])
        for rec in seasonal_recs:
            recommendations.append({
                'type': 'seasonal',
                'priority': 'medium',
                'action': rec,
                'reasoning': f"Based on current {seasonal_analysis['current_season']} conditions"
            })
        
        # Environmental optimization recommendations
        env_recs = self._get_environmental_recommendations(stage, env_data)
        recommendations.extend(env_recs)
        
        # Timeline-based recommendations
        if planting_analysis:
            timeline_recs = self._get_timeline_recommendations(planting_analysis)
            recommendations.extend(timeline_recs)
        
        # Sort by priority
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 1), reverse=True)
        
        return recommendations[:10]  # Return top 10 recommendations
    
    def _get_stage_recommendations(self, stage: str, stage_analysis: Dict) -> List[Dict]:
        """Get stage-specific recommendations"""
        recommendations = []
        stage_info = stage_analysis['stage_info']
        
        # Nutrient recommendations
        for nutrient in stage_info['nutrients']:
            recommendations.append({
                'type': 'nutrition',
                'priority': 'high',
                'action': f"Ensure adequate {nutrient} supply",
                'reasoning': f"Critical nutrient for {stage} stage development"
            })
        
        # Common issue prevention
        for issue in stage_info['common_issues']:
            recommendations.append({
                'type': 'preventive',
                'priority': 'medium',
                'action': f"Monitor and prevent {issue.replace('_', ' ')}",
                'reasoning': f"Common issue during {stage} stage"
            })
        
        return recommendations
    
    def _get_environmental_recommendations(self, stage: str, env_data: Dict) -> List[Dict]:
        """Get environmental optimization recommendations"""
        recommendations = []
        stage_req = self.stage_characteristics[stage]
        
        # Temperature recommendations
        if 'temperature' in env_data:
            temp = float(env_data['temperature'])
            temp_range = stage_req['temperature_optimal']
            
            if temp < temp_range[0]:
                recommendations.append({
                    'type': 'environmental',
                    'priority': 'high',
                    'action': f"Increase temperature to optimal range ({temp_range[0]}-{temp_range[1]}°C)",
                    'reasoning': f"Current temperature ({temp}°C) is below optimal for {stage} stage"
                })
            elif temp > temp_range[1]:
                recommendations.append({
                    'type': 'environmental',
                    'priority': 'high',
                    'action': f"Reduce temperature to optimal range ({temp_range[0]}-{temp_range[1]}°C)",
                    'reasoning': f"Current temperature ({temp}°C) is above optimal for {stage} stage"
                })
        
        return recommendations
    
    def _predict_next_stage_timing(self, current_stage: str, env_data: Dict,
                                  planting_date: Optional[str]) -> Dict:
        """Predict timing for next growth stage"""
        try:
            current_idx = self.growth_stages.index(current_stage)
            
            if current_idx >= len(self.growth_stages) - 1:
                return {'message': 'Plant is at final maturity stage'}
            
            next_stage = self.growth_stages[current_idx + 1]
            next_stage_info = self.stage_characteristics[next_stage]
            
            # Estimate timing based on environmental conditions
            base_duration = next_stage_info['duration_days'][0]
            
            # Adjust based on environmental suitability
            env_factor = self._calculate_environmental_factor(next_stage, env_data)
            adjusted_duration = base_duration * env_factor
            
            predicted_date = datetime.now() + timedelta(days=int(adjusted_duration))
            
            return {
                'next_stage': next_stage,
                'estimated_days': int(adjusted_duration),
                'predicted_date': predicted_date.isoformat(),
                'confidence': 'moderate',
                'factors_considered': ['environmental_conditions', 'typical_growth_patterns']
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _calculate_environmental_factor(self, stage: str, env_data: Dict) -> float:
        """Calculate factor to adjust growth timing based on environment"""
        stage_req = self.stage_characteristics[stage]
        factor = 1.0
        
        # Temperature factor
        if 'temperature' in env_data:
            temp = float(env_data['temperature'])
            temp_range = stage_req['temperature_optimal']
            optimal_temp = (temp_range[0] + temp_range[1]) / 2
            
            if temp < temp_range[0] or temp > temp_range[1]:
                factor *= 1.2  # Slower growth in suboptimal temperature
            elif abs(temp - optimal_temp) < 2:
                factor *= 0.9  # Faster growth in optimal temperature
        
        return factor
    
    def _assess_stage_health(self, stage: str, env_data: Dict, 
                           morphological_analysis: Dict) -> Dict:
        """Assess overall health indicators for current stage"""
        health_score = 0.0
        factors = []
        
        # Environmental health contribution
        env_suitability = self._assess_environmental_suitability(stage, env_data)
        if 'overall' in env_suitability:
            env_score = env_suitability['overall']['score']
            health_score += env_score * 0.4
            factors.append(f"Environmental suitability: {env_score:.2f}")
        
        # Morphological health contribution
        if 'overall_health' in morphological_analysis:
            morph_score = morphological_analysis['overall_health'].get('visual_health_score', 0.5)
            health_score += morph_score * 0.3
            factors.append(f"Visual health: {morph_score:.2f}")
        
        # Leaf health contribution
        if 'leaf_analysis' in morphological_analysis:
            leaf_health = morphological_analysis['leaf_analysis'].get('average_green_intensity', 0) / 255
            health_score += leaf_health * 0.3
            factors.append(f"Leaf health: {leaf_health:.2f}")
        
        # Normalize health score
        total_weight = 0.4 + 0.3 + 0.3
        health_score = health_score / total_weight if total_weight > 0 else 0.5
        
        return {
            'overall_health_score': health_score,
            'health_status': 'excellent' if health_score > 0.8 else
                           'good' if health_score > 0.6 else
                           'moderate' if health_score > 0.4 else 'poor',
            'contributing_factors': factors,
            'health_indicators': {
                'vigor': 'high' if health_score > 0.7 else 'moderate' if health_score > 0.4 else 'low',
                'stress_level': 'low' if health_score > 0.6 else 'moderate' if health_score > 0.3 else 'high'
            }
        }
        
    def _analyze_planting_timeline(self, planting_date: str, current_stage: str, 
                                  current_date: datetime) -> Dict:
        """Analyze growth timeline based on planting date"""
        try:
            plant_date = datetime.fromisoformat(planting_date.replace('Z', '+00:00'))
            days_since_planting = (current_date - plant_date).days
            
            # Get expected stage based on days since planting
            expected_stage = self._get_expected_stage(days_since_planting)
            current_stage_idx = self.growth_stages.index(current_stage)
            expected_stage_idx = self.growth_stages.index(expected_stage)
            
            # Calculate development rate
            stage_deviation = current_stage_idx - expected_stage_idx
            
            return {
                'days_since_planting': days_since_planting,
                'expected_stage': expected_stage,
                'current_stage': current_stage,
                'stage_deviation': stage_deviation,
                'development_rate': 'ahead' if stage_deviation > 0 else 
                                  'behind' if stage_deviation < 0 else 'on_track',
                'timeline_assessment': self._assess_timeline_health(stage_deviation, days_since_planting)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _get_expected_stage(self, days: int) -> str:
        """Get expected growth stage based on days since planting"""
        cumulative_days = 0
        
        for stage in self.growth_stages:
            stage_duration = self.stage_characteristics[stage]['duration_days']
            avg_duration = (stage_duration[0] + stage_duration[1]) / 2
            cumulative_days += avg_duration
            
            if days <= cumulative_days:
                return stage
        
        return self.growth_stages[-1]  # Return maturity if beyond all stages
    
    def _assess_timeline_health(self, deviation: int, days: int) -> Dict:
        """Assess health of growth timeline"""
        if abs(deviation) <= 0:
            status = 'optimal'
            message = "Plant development is on schedule"
        elif deviation > 0:
            status = 'accelerated'
            message = f"Plant is developing {deviation} stage(s) ahead of schedule"
        else:
            status = 'delayed'
            message = f"Plant is {abs(deviation)} stage(s) behind expected development"
        
        return {
            'status': status,
            'message': message,
            'concern_level': 'low' if abs(deviation) <= 1 else 'moderate'
        }
    
    def _identify_critical_factors(self, stage: str, env_data: Dict) -> List[Dict]:
        """Identify critical factors affecting current growth stage"""
        critical_factors = []
        stage_req = self.stage_characteristics[stage]
        
        # Water needs assessment
        water_needs = stage_req['water_needs']
        rainfall = float(env_data.get('rainfall', 0))
        
        if water_needs == 'high' and rainfall < 50:
            critical_factors.append({
                'factor': 'water_stress',
                'severity': 'high',
                'impact': 'Growth rate reduction, wilting',
                'recommendation': 'Increase irrigation frequency'
            })
        
        # Temperature stress
        if 'temperature' in env_data:
            temp = float(env_data['temperature'])
            temp_range = stage_req['temperature_optimal']
            
            if temp < temp_range[0] - 5:
                critical_factors.append({
                    'factor': 'cold_stress',
                    'severity': 'high',
                    'impact': 'Slowed metabolism, potential damage',
                    'recommendation': 'Provide protection or heating'
                })
            elif temp > temp_range[1] + 5:
                critical_factors.append({
                    'factor': 'heat_stress',
                    'severity': 'high',
                    'impact': 'Reduced photosynthesis, water loss',
                    'recommendation': 'Provide shade or cooling'
                })
        
        return critical_factors
    
    def _estimate_stage_progress(self, stage: str, env_data: Dict) -> Dict:
        """Estimate progress within current growth stage"""
        # This is a simplified estimation
        # In practice, you'd use more sophisticated models
        
        stage_info = self.stage_characteristics[stage]
        duration_range = stage_info['duration_days']
        avg_duration = (duration_range[0] + duration_range[1]) / 2
        
        # Estimate based on environmental conditions
        env_factor = self._calculate_environmental_factor(stage, env_data)
        adjusted_duration = avg_duration * env_factor
        
        # Assume we're midway through stage for this example
        estimated_progress = 0.5
        
        return {
            'estimated_progress_percentage': estimated_progress * 100,
            'estimated_days_remaining': int(adjusted_duration * (1 - estimated_progress)),
            'stage_duration_estimate': int(adjusted_duration)
        }
    
    def _get_timeline_recommendations(self, planting_analysis: Dict) -> List[Dict]:
        """Get recommendations based on planting timeline analysis"""
        recommendations = []
        
        if planting_analysis.get('development_rate') == 'behind':
            recommendations.append({
                'type': 'timeline',
                'priority': 'high',
                'action': 'Optimize growing conditions to accelerate development',
                'reasoning': 'Plant development is behind expected schedule'
            })
        elif planting_analysis.get('development_rate') == 'ahead':
            recommendations.append({
                'type': 'timeline',
                'priority': 'medium',
                'action': 'Monitor for stress signs due to accelerated growth',
                'reasoning': 'Plant is developing faster than expected'
            })
        
        return recommendations

# Example usage and testing
if __name__ == "__main__":
    analyzer = GrowthStageAnalyzer()
    
    # Example environmental data
    env_data = {
        'temperature': '25',
        'humidity': '70',
        'rainfall': '100',
        'soilPh': '6.5'
    }
    
    print("Growth Stage Analyzer initialized successfully")
    print(f"Available growth stages: {analyzer.growth_stages}")
    
    # Example seasonal analysis
    seasonal_analysis = analyzer.seasonal_analyzer.analyze_seasonal_impact(
        datetime.now(), env_data
    )
    print(f"\nCurrent season: {seasonal_analysis['current_season']}")
    print(f"Season alignment score: {seasonal_analysis['alignment_score']:.2f}")
