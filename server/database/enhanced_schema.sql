-- Enhanced SmartFarm-TZ Database Schema
-- Includes severity assessment, treatment effectiveness, environmental factors, and monitoring

-- Drop tables if they exist (for development/testing)
SET FOREIGN_KEY_CHECKS = 0;

-- Enhanced analysis history table
DROP TABLE IF EXISTS analysis_history_enhanced;
CREATE TABLE analysis_history_enhanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    image_path VARCHAR(500),
    crop_type VARCHAR(100),
    
    -- Disease information
    is_healthy BOOLEAN NOT NULL DEFAULT 0,
    disease_name VARCHAR(200),
    disease_type ENUM('disease', 'pest', 'deficiency', 'toxicity') DEFAULT 'disease',
    
    -- Severity assessment
    severity_level ENUM('mild', 'moderate', 'severe', 'critical') DEFAULT 'mild',
    severity_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    affected_area_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 100.00
    
    -- Confidence and prediction
    confidence DECIMAL(5,4) DEFAULT 0.0000,
    model_version VARCHAR(50) DEFAULT 'v1.0',
    prediction_method ENUM('single', 'ensemble', 'manual') DEFAULT 'single',
    
    -- Treatment and recommendations
    treatment TEXT,
    nutrients TEXT,
    estimated_cost DECIMAL(10,2) DEFAULT 0.00,
    treatment_urgency ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    
    -- Environmental context
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    rainfall DECIMAL(7,2),
    soil_ph DECIMAL(3,1),
    growth_stage ENUM('seedling', 'vegetative', 'flowering', 'fruiting', 'mature', 'senescence'),
    
    -- Location and timing
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(200),
    season ENUM('dry', 'wet', 'transition'),
    
    -- Status and follow-up
    status ENUM('pending', 'diagnosed', 'treated', 'resolved', 'recurrent') DEFAULT 'diagnosed',
    follow_up_required BOOLEAN DEFAULT 1,
    follow_up_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_crop_type (crop_type),
    INDEX idx_disease_name (disease_name),
    INDEX idx_severity (severity_level),
    INDEX idx_location (latitude, longitude),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
);

-- Disease severity reference table
DROP TABLE IF EXISTS disease_severity_reference;
CREATE TABLE disease_severity_reference (
    id INT PRIMARY KEY AUTO_INCREMENT,
    disease_name VARCHAR(200) NOT NULL,
    crop_type VARCHAR(100) NOT NULL,
    severity_level ENUM('mild', 'moderate', 'severe', 'critical') NOT NULL,
    
    -- Visual indicators
    visual_symptoms TEXT,
    affected_area_threshold DECIMAL(5,2), -- Percentage threshold for this severity
    
    -- Impact assessment
    yield_loss_percentage DECIMAL(5,2),
    economic_impact ENUM('low', 'medium', 'high', 'very_high'),
    
    -- Treatment urgency
    days_to_treat INT DEFAULT 7,
    treatment_priority ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_disease_severity (disease_name, crop_type, severity_level)
);

-- Treatment effectiveness tracking
DROP TABLE IF EXISTS treatment_effectiveness;
CREATE TABLE treatment_effectiveness (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Treatment details
    treatment_applied TEXT NOT NULL,
    application_date DATE NOT NULL,
    dosage_used VARCHAR(100),
    application_method VARCHAR(100),
    cost_actual DECIMAL(10,2),
    
    -- Effectiveness assessment
    effectiveness_rating ENUM('very_poor', 'poor', 'fair', 'good', 'excellent'),
    improvement_percentage DECIMAL(5,2), -- 0-100%
    days_to_improvement INT,
    side_effects TEXT,
    
    -- Follow-up status
    complete_recovery BOOLEAN DEFAULT 0,
    recurrence BOOLEAN DEFAULT 0,
    recurrence_date DATE,
    
    -- User satisfaction
    user_satisfaction ENUM('very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied'),
    would_recommend BOOLEAN,
    additional_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (analysis_id) REFERENCES analysis_history_enhanced(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_user_id (user_id),
    INDEX idx_effectiveness (effectiveness_rating),
    INDEX idx_application_date (application_date)
);

-- User feedback and ratings
DROP TABLE IF EXISTS user_feedback;
CREATE TABLE user_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    analysis_id INT,
    
    -- Feedback type
    feedback_type ENUM('diagnosis_accuracy', 'treatment_recommendation', 'app_usability', 'general') NOT NULL,
    
    -- Ratings (1-5 scale)
    accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
    helpfulness_rating INT CHECK (helpfulness_rating BETWEEN 1 AND 5),
    ease_of_use_rating INT CHECK (ease_of_use_rating BETWEEN 1 AND 5),
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    
    -- Detailed feedback
    feedback_text TEXT,
    suggested_improvements TEXT,
    
    -- Verification
    expert_verified BOOLEAN DEFAULT 0,
    expert_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES analysis_history_enhanced(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_overall_rating (overall_rating),
    INDEX idx_created_at (created_at)
);

-- Environmental monitoring data
DROP TABLE IF EXISTS environmental_data;
CREATE TABLE environmental_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(200),
    region VARCHAR(100),
    district VARCHAR(100),
    
    -- Weather data
    temperature_current DECIMAL(5,2),
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    humidity DECIMAL(5,2),
    rainfall_daily DECIMAL(7,2),
    rainfall_weekly DECIMAL(7,2),
    rainfall_monthly DECIMAL(7,2),
    wind_speed DECIMAL(5,2),
    wind_direction VARCHAR(10),
    pressure DECIMAL(7,2),
    uv_index DECIMAL(3,1),
    
    -- Soil conditions
    soil_moisture DECIMAL(5,2),
    soil_temperature DECIMAL(5,2),
    soil_ph DECIMAL(3,1),
    soil_ec DECIMAL(6,2), -- Electrical conductivity
    soil_npk_n DECIMAL(5,2),
    soil_npk_p DECIMAL(5,2),
    soil_npk_k DECIMAL(5,2),
    
    -- Seasonal information
    season ENUM('dry', 'wet', 'transition'),
    growing_degree_days INT,
    
    -- Data source
    data_source VARCHAR(100) DEFAULT 'weather_api',
    data_quality ENUM('high', 'medium', 'low') DEFAULT 'high',
    
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_location (latitude, longitude),
    INDEX idx_location_name (location_name),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_season (season)
);

-- Disease outbreak monitoring
DROP TABLE IF EXISTS disease_outbreaks;
CREATE TABLE disease_outbreaks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Disease information
    disease_name VARCHAR(200) NOT NULL,
    crop_type VARCHAR(100) NOT NULL,
    
    -- Location and scope
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(200),
    region VARCHAR(100),
    affected_radius_km DECIMAL(6,2) DEFAULT 0.00,
    
    -- Outbreak severity
    severity_level ENUM('mild', 'moderate', 'severe', 'critical') NOT NULL,
    cases_count INT DEFAULT 1,
    affected_area_hectares DECIMAL(10,2),
    
    -- Status and timeline
    status ENUM('emerging', 'active', 'controlled', 'resolved') DEFAULT 'emerging',
    first_reported_date DATE NOT NULL,
    last_updated_date DATE,
    resolved_date DATE,
    
    -- Impact assessment
    economic_loss_estimated DECIMAL(15,2),
    farmers_affected INT,
    yield_loss_percentage DECIMAL(5,2),
    
    -- Response information
    control_measures_taken TEXT,
    authorities_notified BOOLEAN DEFAULT 0,
    expert_intervention BOOLEAN DEFAULT 0,
    
    -- Environmental factors
    temperature_avg DECIMAL(5,2),
    humidity_avg DECIMAL(5,2),
    rainfall_mm DECIMAL(7,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_disease_crop (disease_name, crop_type),
    INDEX idx_location (latitude, longitude),
    INDEX idx_severity (severity_level),
    INDEX idx_status (status),
    INDEX idx_first_reported (first_reported_date),
    INDEX idx_region (region)
);

-- Regional disease patterns
DROP TABLE IF EXISTS regional_disease_patterns;
CREATE TABLE regional_disease_patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Geographic information
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    crop_type VARCHAR(100) NOT NULL,
    disease_name VARCHAR(200) NOT NULL,
    
    -- Temporal patterns
    season ENUM('dry', 'wet', 'transition'),
    month_peak INT CHECK (month_peak BETWEEN 1 AND 12),
    
    -- Frequency and severity
    occurrence_frequency ENUM('rare', 'occasional', 'frequent', 'endemic'),
    typical_severity ENUM('mild', 'moderate', 'severe', 'critical'),
    
    -- Historical data
    years_observed INT DEFAULT 1,
    first_observed_year YEAR,
    last_observed_year YEAR,
    
    -- Risk assessment
    risk_level ENUM('low', 'medium', 'high', 'very_high'),
    climate_correlation TEXT,
    
    -- Economic impact
    avg_yield_loss DECIMAL(5,2),
    avg_economic_loss DECIMAL(12,2),
    
    -- Prevention and control
    preventive_measures TEXT,
    effective_treatments TEXT,
    resistant_varieties TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_pattern (region, crop_type, disease_name, season),
    INDEX idx_region_crop (region, crop_type),
    INDEX idx_disease (disease_name),
    INDEX idx_risk_level (risk_level),
    INDEX idx_season (season)
);

-- Treatment cost database
DROP TABLE IF EXISTS treatment_costs;
CREATE TABLE treatment_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Treatment information
    treatment_name VARCHAR(200) NOT NULL,
    treatment_type ENUM('chemical', 'biological', 'cultural', 'integrated') NOT NULL,
    active_ingredient VARCHAR(200),
    
    -- Disease and crop specificity
    disease_name VARCHAR(200),
    crop_type VARCHAR(100),
    
    -- Cost information
    cost_per_unit DECIMAL(10,2) NOT NULL,
    unit_type VARCHAR(50) NOT NULL, -- e.g., 'liter', 'kg', 'hectare'
    cost_per_hectare DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'TZS',
    
    -- Application details
    application_rate VARCHAR(100),
    applications_needed INT DEFAULT 1,
    interval_days INT,
    
    -- Availability and source
    availability ENUM('widely_available', 'moderately_available', 'limited', 'rare'),
    supplier_type ENUM('agro_dealer', 'cooperative', 'government', 'online') DEFAULT 'agro_dealer',
    brand_names TEXT,
    
    -- Effectiveness
    effectiveness_rating ENUM('poor', 'fair', 'good', 'excellent'),
    resistance_potential ENUM('low', 'medium', 'high'),
    
    -- Location-specific pricing
    region VARCHAR(100),
    price_variation_notes TEXT,
    
    -- Data maintenance
    last_updated DATE NOT NULL,
    data_source VARCHAR(100),
    verified_by VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_treatment_name (treatment_name),
    INDEX idx_disease_crop (disease_name, crop_type),
    INDEX idx_cost_per_hectare (cost_per_hectare),
    INDEX idx_availability (availability),
    INDEX idx_region (region)
);

-- Notification preferences and delivery
DROP TABLE IF EXISTS notification_preferences;
CREATE TABLE notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Notification types
    diagnosis_results BOOLEAN DEFAULT 1,
    treatment_reminders BOOLEAN DEFAULT 1,
    follow_up_alerts BOOLEAN DEFAULT 1,
    outbreak_warnings BOOLEAN DEFAULT 1,
    weather_alerts BOOLEAN DEFAULT 0,
    system_updates BOOLEAN DEFAULT 0,
    
    -- Delivery methods
    email_enabled BOOLEAN DEFAULT 1,
    sms_enabled BOOLEAN DEFAULT 0,
    push_enabled BOOLEAN DEFAULT 1,
    whatsapp_enabled BOOLEAN DEFAULT 0,
    
    -- Contact information
    email VARCHAR(255),
    phone_number VARCHAR(20),
    whatsapp_number VARCHAR(20),
    
    -- Preferences
    language ENUM('en', 'sw') DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Africa/Dar_es_Salaam',
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '06:00:00',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_prefs (user_id)
);

-- Notification delivery log
DROP TABLE IF EXISTS notification_log;
CREATE TABLE notification_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    analysis_id INT,
    
    -- Notification details
    notification_type ENUM('diagnosis', 'treatment_reminder', 'follow_up', 'outbreak', 'weather', 'system') NOT NULL,
    delivery_method ENUM('email', 'sms', 'push', 'whatsapp') NOT NULL,
    
    -- Content
    subject VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Status
    status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failure_reason TEXT,
    
    -- Tracking
    opened BOOLEAN DEFAULT 0,
    clicked BOOLEAN DEFAULT 0,
    response_action VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES analysis_history_enhanced(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- System statistics and analytics
DROP TABLE IF EXISTS system_analytics;
CREATE TABLE system_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Time period
    date_recorded DATE NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    
    -- Usage statistics
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_registrations INT DEFAULT 0,
    total_analyses INT DEFAULT 0,
    successful_analyses INT DEFAULT 0,
    failed_analyses INT DEFAULT 0,
    
    -- Popular crops and diseases
    top_crop_types JSON,
    top_diseases JSON,
    top_regions JSON,
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(8,2),
    model_accuracy_avg DECIMAL(5,4),
    user_satisfaction_avg DECIMAL(3,2),
    
    -- Regional statistics
    analyses_by_region JSON,
    outbreaks_by_region JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_date_period (date_recorded, period_type),
    INDEX idx_date_recorded (date_recorded),
    INDEX idx_period_type (period_type)
);

-- Migrate existing data (if needed)
-- INSERT INTO analysis_history_enhanced (
--     user_id, image_path, crop_type, is_healthy, disease_name, 
--     disease_type, treatment, nutrients, confidence, created_at
-- )
-- SELECT 
--     user_id, image_path, crop_type, is_healthy, disease_name,
--     'disease', treatment, nutrients, confidence, created_at
-- FROM analysis_history;

SET FOREIGN_KEY_CHECKS = 1;

-- Insert sample severity reference data
INSERT INTO disease_severity_reference (disease_name, crop_type, severity_level, visual_symptoms, affected_area_threshold, yield_loss_percentage, economic_impact, days_to_treat) VALUES
('Tomato___Early_blight', 'Tomato', 'mild', 'Small dark spots on lower leaves', 5.0, 5.0, 'low', 14),
('Tomato___Early_blight', 'Tomato', 'moderate', 'Concentric rings on leaves, some yellowing', 15.0, 15.0, 'medium', 7),
('Tomato___Early_blight', 'Tomato', 'severe', 'Extensive leaf damage, stem lesions', 35.0, 35.0, 'high', 3),
('Tomato___Early_blight', 'Tomato', 'critical', 'Plant defoliation, fruit rot', 60.0, 60.0, 'very_high', 1),

('Tomato___Late_blight', 'Tomato', 'mild', 'Water-soaked lesions on leaves', 3.0, 10.0, 'medium', 7),
('Tomato___Late_blight', 'Tomato', 'moderate', 'Brown lesions with white sporulation', 10.0, 25.0, 'high', 3),
('Tomato___Late_blight', 'Tomato', 'severe', 'Rapid leaf and stem destruction', 25.0, 50.0, 'very_high', 2),
('Tomato___Late_blight', 'Tomato', 'critical', 'Complete plant collapse', 50.0, 80.0, 'very_high', 1),

('Corn_(maize)___Northern_Leaf_Blight', 'Corn', 'mild', 'Small elliptical lesions on lower leaves', 8.0, 8.0, 'low', 10),
('Corn_(maize)___Northern_Leaf_Blight', 'Corn', 'moderate', 'Lesions expanding, some leaf yellowing', 20.0, 20.0, 'medium', 7),
('Corn_(maize)___Northern_Leaf_Blight', 'Corn', 'severe', 'Extensive leaf damage, ear infection possible', 40.0, 40.0, 'high', 3),

('Potato___Late_blight', 'Potato', 'mild', 'Small dark spots on leaves', 5.0, 12.0, 'medium', 5),
('Potato___Late_blight', 'Potato', 'moderate', 'Expanding lesions, white sporulation', 15.0, 30.0, 'high', 3),
('Potato___Late_blight', 'Potato', 'severe', 'Rapid foliage destruction, tuber infection', 30.0, 60.0, 'very_high', 1),

('Apple___Apple_scab', 'Apple', 'mild', 'Small olive-green spots on leaves', 10.0, 5.0, 'low', 14),
('Apple___Apple_scab', 'Apple', 'moderate', 'Spots enlarging, some fruit lesions', 25.0, 15.0, 'medium', 7),
('Apple___Apple_scab', 'Apple', 'severe', 'Severe defoliation, fruit cracking', 50.0, 35.0, 'high', 3);

-- Insert sample treatment costs
INSERT INTO treatment_costs (treatment_name, treatment_type, active_ingredient, disease_name, crop_type, cost_per_unit, unit_type, cost_per_hectare, application_rate, applications_needed, availability, effectiveness_rating, region, last_updated, data_source) VALUES
('Copper Oxychloride 50% WP', 'chemical', 'Copper Oxychloride', 'Tomato___Early_blight', 'Tomato', 15000.00, 'kg', 45000.00, '3g/L', 3, 'widely_available', 'good', 'Dar es Salaam', '2025-01-15', 'market_survey'),
('Mancozeb 75% WP', 'chemical', 'Mancozeb', 'Tomato___Late_blight', 'Tomato', 12000.00, 'kg', 36000.00, '2g/L', 2, 'widely_available', 'excellent', 'Dar es Salaam', '2025-01-15', 'market_survey'),
('Ridomil Gold 68% WP', 'chemical', 'Metalaxyl + Mancozeb', 'Potato___Late_blight', 'Potato', 25000.00, 'kg', 62500.00, '2.5g/L', 2, 'moderately_available', 'excellent', 'Arusha', '2025-01-15', 'market_survey'),
('Neem Oil', 'biological', 'Azadirachtin', 'General', 'All', 8000.00, 'liter', 40000.00, '5ml/L', 4, 'widely_available', 'fair', 'All regions', '2025-01-15', 'market_survey'),
('Trichoderma Bio-fungicide', 'biological', 'Trichoderma spp.', 'Soil-borne diseases', 'All', 18000.00, 'kg', 36000.00, '2g/L', 1, 'moderately_available', 'good', 'Mbeya', '2025-01-15', 'market_survey');

COMMIT;
