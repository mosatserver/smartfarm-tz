const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for image uploads with enhanced options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'crop-health');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased)
    files: 5 // Allow up to 5 files for batch processing
  }
});

// Enhanced analysis with severity assessment and environmental factors
router.post('/analyze-enhanced', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { 
      lang = 'en',
      latitude,
      longitude,
      locationName,
      temperature,
      humidity,
      rainfall,
      soilPh,
      growthStage,
      season
    } = req.body;
    const userId = req.userId;
    
    console.log('🚀 === ENHANCED CROP HEALTH ANALYSIS STARTED ===');
    console.log('👤 User ID:', userId);
    console.log('🌍 Language:', lang);
    console.log('📍 Location:', { latitude, longitude, locationName });
    console.log('🌡️ Environmental:', { temperature, humidity, rainfall, soilPh });
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Get weather data if location provided but no environmental data
    let environmentalData = { temperature, humidity, rainfall };
    if (latitude && longitude && (!temperature || !humidity)) {
      try {
        environmentalData = await getWeatherData(latitude, longitude);
      } catch (weatherError) {
        console.warn('⚠️ Could not fetch weather data:', weatherError.message);
      }
    }

    // Run AI prediction
    let analysisResult;
    try {
      analysisResult = await runEnhancedPrediction(req.file.path, environmentalData);
    } catch (aiError) {
      console.log('🤖 Enhanced prediction failed, using standard analysis:', aiError.message);
      analysisResult = await runStandardPrediction(req.file.path);
    }

    // Assess severity based on prediction and environmental factors
    const severityAssessment = await assessSeverity(
      analysisResult.predicted_class,
      analysisResult.confidence,
      environmentalData,
      growthStage
    );

    // Get treatment recommendations with cost estimates
    const treatmentRecommendations = await getTreatmentWithCosts(
      analysisResult.predicted_class,
      severityAssessment.level,
      latitude,
      longitude
    );

    // Determine crop type
    const cropType = determineCropType(analysisResult.predicted_class) || 'Unknown';

    // Translate results
    const translatedResult = translateAnalysisResult(analysisResult, lang);

    // Enhanced result object
    const enhancedResult = {
      ...translatedResult,
      crop_type: cropType,
      severity: severityAssessment,
      treatment_recommendations: treatmentRecommendations,
      environmental_context: environmentalData,
      location: {
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        name: locationName || null
      },
      growth_stage: growthStage || null,
      season: season || determineSeason(environmentalData),
      analysis_timestamp: new Date().toISOString(),
      model_version: 'v2.0-enhanced'
    };

    // Save to enhanced analysis history
    const [insertResult] = await pool.execute(`
      INSERT INTO analysis_history_enhanced (
        user_id, image_path, crop_type, is_healthy, disease_name, 
        disease_type, severity_level, severity_score, affected_area_percentage,
        confidence, model_version, treatment, nutrients, estimated_cost,
        treatment_urgency, temperature, humidity, rainfall, soil_ph,
        growth_stage, latitude, longitude, location_name, season,
        status, follow_up_required, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      req.file.path,
      cropType,
      translatedResult.is_healthy,
      translatedResult.disease_name || null,
      translatedResult.disease_type || 'disease',
      severityAssessment.level,
      severityAssessment.score,
      severityAssessment.affected_area_percentage,
      translatedResult.confidence,
      'v2.0-enhanced',
      treatmentRecommendations.primary?.treatment || translatedResult.treatment,
      translatedResult.nutrients,
      treatmentRecommendations.estimated_total_cost || 0,
      severityAssessment.urgency,
      environmentalData.temperature || null,
      environmentalData.humidity || null,
      environmentalData.rainfall || null,
      parseFloat(soilPh) || null,
      growthStage || null,
      parseFloat(latitude) || null,
      parseFloat(longitude) || null,
      locationName || null,
      season || determineSeason(environmentalData),
      'diagnosed',
      !translatedResult.is_healthy
    ]);

    // Add analysis ID to response
    enhancedResult.analysis_id = insertResult.insertId;

    // Check for outbreak patterns
    if (!translatedResult.is_healthy && latitude && longitude) {
      checkOutbreakPattern(
        translatedResult.disease_name,
        cropType,
        parseFloat(latitude),
        parseFloat(longitude),
        severityAssessment.level
      ).catch(err => console.error('Outbreak pattern check failed:', err));
    }

    // Send notification if enabled
    sendAnalysisNotification(userId, enhancedResult).catch(err => 
      console.error('Notification failed:', err)
    );

    console.log('✅ Enhanced analysis completed and saved');

    res.json({
      success: true,
      ...enhancedResult
    });

  } catch (error) {
    console.error('❌ Enhanced analysis error:', error);
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Enhanced analysis failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Batch processing endpoint
router.post('/analyze-batch', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { lang = 'en' } = req.body;
    const userId = req.userId;
    
    console.log('📦 === BATCH ANALYSIS STARTED ===');
    console.log('👤 User ID:', userId);
    console.log('📁 Files received:', req.files?.length || 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const batchResults = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        console.log(`🔍 Processing image ${i + 1}/${req.files.length}: ${file.filename}`);
        
        // Run prediction
        const analysisResult = await runStandardPrediction(file.path);
        const cropType = determineCropType(analysisResult.predicted_class);
        const translatedResult = translateAnalysisResult(analysisResult, lang);
        
        // Save to database
        await pool.execute(`
          INSERT INTO analysis_history_enhanced (
            user_id, image_path, crop_type, is_healthy, disease_name,
            confidence, model_version, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          userId,
          file.path,
          cropType,
          translatedResult.is_healthy,
          translatedResult.disease_name || null,
          translatedResult.confidence,
          'v2.0-batch',
          'diagnosed'
        ]);

        batchResults.push({
          filename: file.originalname,
          index: i,
          success: true,
          ...translatedResult,
          crop_type: cropType
        });

      } catch (analysisError) {
        console.error(`❌ Error processing ${file.filename}:`, analysisError.message);
        errors.push({
          filename: file.originalname,
          index: i,
          error: analysisError.message
        });
      }
    }

    console.log(`✅ Batch analysis completed. Success: ${batchResults.length}, Errors: ${errors.length}`);

    res.json({
      success: true,
      results: batchResults,
      errors: errors,
      summary: {
        total_files: req.files.length,
        successful_analyses: batchResults.length,
        failed_analyses: errors.length,
        processing_time: Date.now() - Date.now() // Would need to track actual time
      }
    });

  } catch (error) {
    console.error('❌ Batch analysis error:', error);
    
    // Clean up uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.error('Failed to cleanup file:', cleanupError);
          }
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Batch analysis failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Treatment effectiveness feedback
router.post('/treatment-feedback', authenticateToken, async (req, res) => {
  try {
    const {
      analysisId,
      treatmentApplied,
      applicationDate,
      dosageUsed,
      applicationMethod,
      costActual,
      effectivenessRating,
      improvementPercentage,
      daysToImprovement,
      sideEffects,
      completeRecovery,
      userSatisfaction,
      wouldRecommend,
      additionalNotes
    } = req.body;
    
    const userId = req.userId;

    await pool.execute(`
      INSERT INTO treatment_effectiveness (
        analysis_id, user_id, treatment_applied, application_date,
        dosage_used, application_method, cost_actual, effectiveness_rating,
        improvement_percentage, days_to_improvement, side_effects,
        complete_recovery, user_satisfaction, would_recommend,
        additional_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      analysisId, userId, treatmentApplied, applicationDate,
      dosageUsed, applicationMethod, costActual, effectivenessRating,
      improvementPercentage, daysToImprovement, sideEffects,
      completeRecovery, userSatisfaction, wouldRecommend, additionalNotes
    ]);

    res.json({
      success: true,
      message: 'Treatment feedback recorded successfully'
    });

  } catch (error) {
    console.error('❌ Treatment feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record treatment feedback'
    });
  }
});

// User feedback endpoint
router.post('/user-feedback', authenticateToken, async (req, res) => {
  try {
    const {
      analysisId,
      feedbackType,
      accuracyRating,
      helpfulnessRating,
      easeOfUseRating,
      overallRating,
      feedbackText,
      suggestedImprovements
    } = req.body;
    
    const userId = req.userId;

    await pool.execute(`
      INSERT INTO user_feedback (
        user_id, analysis_id, feedback_type, accuracy_rating,
        helpfulness_rating, ease_of_use_rating, overall_rating,
        feedback_text, suggested_improvements, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId, analysisId, feedbackType, accuracyRating,
      helpfulnessRating, easeOfUseRating, overallRating,
      feedbackText, suggestedImprovements
    ]);

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('❌ User feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Enhanced history with pagination and filters
router.get('/history-enhanced', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      limit = 20, 
      offset = 0, 
      cropType, 
      diseaseType, 
      severityLevel, 
      startDate, 
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Build query conditions
    let whereConditions = ['user_id = ?'];
    let queryParams = [userId];

    if (cropType) {
      whereConditions.push('crop_type = ?');
      queryParams.push(cropType);
    }
    if (diseaseType) {
      whereConditions.push('disease_type = ?');
      queryParams.push(diseaseType);
    }
    if (severityLevel) {
      whereConditions.push('severity_level = ?');
      queryParams.push(severityLevel);
    }
    if (startDate) {
      whereConditions.push('created_at >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push('created_at <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');
    const validSortFields = ['created_at', 'confidence', 'severity_score', 'crop_type'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const [history] = await pool.execute(`
      SELECT 
        id, crop_type, is_healthy, disease_name, disease_type,
        severity_level, severity_score, affected_area_percentage,
        confidence, model_version, treatment, nutrients,
        estimated_cost, treatment_urgency, temperature, humidity,
        rainfall, growth_stage, location_name, season, status,
        follow_up_required, follow_up_date, created_at, updated_at
      FROM analysis_history_enhanced 
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, queryParams);

    // Get total count for pagination
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM analysis_history_enhanced WHERE ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      history: history,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: countResult[0].total > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Enhanced history fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis history'
    });
  }
});

// Enhanced statistics with environmental correlations
router.get('/statistics-enhanced', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { period = '30' } = req.query; // days

    // Basic statistics
    const [basicStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_analyses,
        SUM(CASE WHEN is_healthy = 1 THEN 1 ELSE 0 END) as healthy_count,
        SUM(CASE WHEN is_healthy = 0 THEN 1 ELSE 0 END) as unhealthy_count,
        AVG(confidence) as avg_confidence,
        COUNT(DISTINCT crop_type) as crop_types_analyzed,
        AVG(severity_score) as avg_severity_score
      FROM analysis_history_enhanced 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [userId, period]);

    // Severity distribution
    const [severityStats] = await pool.execute(`
      SELECT 
        severity_level,
        COUNT(*) as count,
        AVG(estimated_cost) as avg_cost
      FROM analysis_history_enhanced 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND severity_level IS NOT NULL
      GROUP BY severity_level
    `, [userId, period]);

    // Disease trends by crop
    const [diseaseStats] = await pool.execute(`
      SELECT 
        crop_type,
        disease_name,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence
      FROM analysis_history_enhanced 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND is_healthy = 0
      GROUP BY crop_type, disease_name
      ORDER BY count DESC
      LIMIT 10
    `, [userId, period]);

    // Environmental correlations
    const [environmentalStats] = await pool.execute(`
      SELECT 
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        AVG(rainfall) as avg_rainfall,
        COUNT(CASE WHEN is_healthy = 0 AND temperature > 30 THEN 1 END) as high_temp_diseases,
        COUNT(CASE WHEN is_healthy = 0 AND humidity > 80 THEN 1 END) as high_humidity_diseases
      FROM analysis_history_enhanced 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND temperature IS NOT NULL
    `, [userId, period]);

    // Treatment effectiveness summary
    const [treatmentStats] = await pool.execute(`
      SELECT 
        AVG(CASE WHEN effectiveness_rating = 'excellent' THEN 5
                 WHEN effectiveness_rating = 'good' THEN 4
                 WHEN effectiveness_rating = 'fair' THEN 3
                 WHEN effectiveness_rating = 'poor' THEN 2
                 WHEN effectiveness_rating = 'very_poor' THEN 1
                 ELSE NULL END) as avg_effectiveness_rating,
        AVG(improvement_percentage) as avg_improvement,
        AVG(days_to_improvement) as avg_days_to_improvement,
        COUNT(*) as total_treatments
      FROM treatment_effectiveness te
      JOIN analysis_history_enhanced ahe ON te.analysis_id = ahe.id
      WHERE ahe.user_id = ? AND te.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [userId, period]);

    res.json({
      success: true,
      period_days: parseInt(period),
      statistics: {
        basic: basicStats[0],
        severity_distribution: severityStats,
        disease_trends: diseaseStats,
        environmental_correlations: environmentalStats[0],
        treatment_effectiveness: treatmentStats[0]
      }
    });

  } catch (error) {
    console.error('❌ Enhanced statistics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enhanced statistics'
    });
  }
});

// Get outbreak alerts for a region
router.get('/outbreak-alerts', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates required'
      });
    }

    const [outbreaks] = await pool.execute(`
      SELECT 
        disease_name, crop_type, severity_level, cases_count,
        location_name, affected_radius_km, status,
        first_reported_date, last_updated_date,
        control_measures_taken,
        ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * 
          cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * 
          sin( radians( latitude ) ) ) ) AS distance
      FROM disease_outbreaks
      WHERE status IN ('emerging', 'active')
      HAVING distance <= ?
      ORDER BY distance, severity_level DESC, cases_count DESC
    `, [latitude, longitude, latitude, radius]);

    res.json({
      success: true,
      outbreaks: outbreaks,
      location: { latitude, longitude, radius }
    });

  } catch (error) {
    console.error('❌ Outbreak alerts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch outbreak alerts'
    });
  }
});

// Helper Functions

async function runEnhancedPrediction(imagePath, environmentalData) {
  // This would call an enhanced prediction model that considers environmental factors
  // For now, we'll use the standard prediction and enhance the result
  const standardResult = await runStandardPrediction(imagePath);
  
  // Enhance with environmental context
  if (environmentalData.temperature > 30 && environmentalData.humidity > 80) {
    // High temperature and humidity increase disease risk
    standardResult.environmental_risk_factor = 'high';
  } else if (environmentalData.temperature < 15 || environmentalData.humidity < 40) {
    standardResult.environmental_risk_factor = 'low';
  } else {
    standardResult.environmental_risk_factor = 'medium';
  }

  return standardResult;
}

async function runStandardPrediction(imagePath) {
  return new Promise((resolve, reject) => {
    const aiServicePath = path.join(__dirname, '..', '..', 'ai-service');
    const pythonScript = path.join(aiServicePath, 'predict.py');
    
    let pythonCommand = 'python3';
    const windowsPythonPath = path.join(aiServicePath, 'venv', 'Scripts', 'python.exe');
    const unixPythonPath = path.join(aiServicePath, 'venv', 'bin', 'python');
    
    if (fs.existsSync(windowsPythonPath)) {
      pythonCommand = windowsPythonPath;
    } else if (fs.existsSync(unixPythonPath)) {
      pythonCommand = unixPythonPath;
    }
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, imagePath], {
      cwd: aiServicePath,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(outputData.trim());
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Prediction failed'));
          }
        } catch (parseError) {
          reject(new Error('Failed to parse prediction result'));
        }
      } else {
        reject(new Error(`Prediction process exited with code ${code}: ${errorData}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error('Failed to start prediction process: ' + error.message));
    });
  });
}

async function assessSeverity(predictedClass, confidence, environmentalData, growthStage) {
  try {
    // Get severity reference from database
    const [severityRef] = await pool.execute(`
      SELECT 
        severity_level, affected_area_threshold, yield_loss_percentage,
        economic_impact, days_to_treat, treatment_priority
      FROM disease_severity_reference 
      WHERE disease_name = ? 
      ORDER BY affected_area_threshold ASC
    `, [predictedClass]);

    // Default assessment if no reference data
    if (severityRef.length === 0) {
      return {
        level: confidence > 0.8 ? 'moderate' : 'mild',
        score: confidence,
        affected_area_percentage: Math.round(confidence * 50),
        urgency: confidence > 0.8 ? 'medium' : 'low',
        estimated_yield_loss: Math.round(confidence * 20),
        days_to_treat: 7,
        environmental_risk_factors: assessEnvironmentalRisk(environmentalData, growthStage)
      };
    }

    // Determine severity based on confidence and environmental factors
    let severityLevel = 'mild';
    let baseScore = confidence;
    
    // Adjust based on environmental factors
    let environmentalMultiplier = 1.0;
    
    if (environmentalData.temperature > 30 && environmentalData.humidity > 80) {
      environmentalMultiplier = 1.3; // High risk conditions
    } else if (environmentalData.temperature < 15 || environmentalData.humidity < 40) {
      environmentalMultiplier = 0.8; // Low risk conditions
    }
    
    // Adjust for growth stage vulnerability
    if (growthStage === 'flowering' || growthStage === 'fruiting') {
      environmentalMultiplier *= 1.2; // More vulnerable stages
    }
    
    const adjustedScore = Math.min(baseScore * environmentalMultiplier, 1.0);
    
    // Determine severity level based on adjusted score
    if (adjustedScore > 0.9) {
      severityLevel = 'critical';
    } else if (adjustedScore > 0.7) {
      severityLevel = 'severe';
    } else if (adjustedScore > 0.5) {
      severityLevel = 'moderate';
    } else {
      severityLevel = 'mild';
    }
    
    // Get reference data for this severity level
    const refData = severityRef.find(ref => ref.severity_level === severityLevel) || severityRef[0];
    
    return {
      level: severityLevel,
      score: adjustedScore,
      affected_area_percentage: Math.round(adjustedScore * 60),
      urgency: refData.treatment_priority,
      estimated_yield_loss: refData.yield_loss_percentage,
      days_to_treat: refData.days_to_treat,
      environmental_risk_factors: assessEnvironmentalRisk(environmentalData, growthStage)
    };

  } catch (error) {
    console.error('Error in severity assessment:', error);
    return {
      level: 'mild',
      score: confidence,
      affected_area_percentage: Math.round(confidence * 30),
      urgency: 'low',
      estimated_yield_loss: 10,
      days_to_treat: 7,
      environmental_risk_factors: []
    };
  }
}

function assessEnvironmentalRisk(environmentalData, growthStage) {
  const riskFactors = [];
  
  if (environmentalData.temperature > 32) {
    riskFactors.push('High temperature stress');
  }
  if (environmentalData.temperature < 12) {
    riskFactors.push('Low temperature stress');
  }
  if (environmentalData.humidity > 85) {
    riskFactors.push('High humidity - favorable for fungal diseases');
  }
  if (environmentalData.humidity < 30) {
    riskFactors.push('Low humidity - plant stress');
  }
  if (environmentalData.rainfall > 50) {
    riskFactors.push('Excessive moisture - disease risk');
  }
  if (growthStage === 'flowering') {
    riskFactors.push('Flowering stage - increased vulnerability');
  }
  if (growthStage === 'fruiting') {
    riskFactors.push('Fruiting stage - critical protection period');
  }
  
  return riskFactors;
}

async function getTreatmentWithCosts(predictedClass, severityLevel, latitude, longitude) {
  try {
    // Get treatment recommendations with costs
    const [treatments] = await pool.execute(`
      SELECT 
        treatment_name, treatment_type, active_ingredient,
        cost_per_unit, unit_type, cost_per_hectare,
        application_rate, applications_needed, interval_days,
        availability, effectiveness_rating, supplier_type,
        brand_names
      FROM treatment_costs 
      WHERE (disease_name = ? OR disease_name = 'General')
        AND availability IN ('widely_available', 'moderately_available')
      ORDER BY 
        CASE WHEN disease_name = ? THEN 1 ELSE 2 END,
        effectiveness_rating DESC,
        cost_per_hectare ASC
      LIMIT 5
    `, [predictedClass, predictedClass]);

    if (treatments.length === 0) {
      return {
        primary: null,
        alternatives: [],
        estimated_total_cost: 0,
        cost_breakdown: []
      };
    }

    // Calculate costs based on severity (affects application frequency)
    const severityMultiplier = {
      'mild': 1.0,
      'moderate': 1.2,
      'severe': 1.5,
      'critical': 2.0
    };

    const multiplier = severityMultiplier[severityLevel] || 1.0;

    const treatmentRecommendations = treatments.map(treatment => ({
      ...treatment,
      estimated_cost_per_hectare: treatment.cost_per_hectare * multiplier * treatment.applications_needed,
      applications_recommended: Math.ceil(treatment.applications_needed * multiplier),
      urgency_adjusted: true
    }));

    return {
      primary: treatmentRecommendations[0],
      alternatives: treatmentRecommendations.slice(1, 3),
      estimated_total_cost: treatmentRecommendations[0]?.estimated_cost_per_hectare || 0,
      cost_breakdown: treatmentRecommendations.map(t => ({
        name: t.treatment_name,
        cost: t.estimated_cost_per_hectare,
        applications: t.applications_recommended
      })),
      severity_multiplier: multiplier
    };

  } catch (error) {
    console.error('Error getting treatment costs:', error);
    return {
      primary: null,
      alternatives: [],
      estimated_total_cost: 0,
      cost_breakdown: []
    };
  }
}

async function getWeatherData(latitude, longitude) {
  try {
    // This would integrate with a weather API like OpenWeatherMap
    // For now, return mock data
    return {
      temperature: 25 + Math.random() * 10,
      humidity: 60 + Math.random() * 30,
      rainfall: Math.random() * 10,
      wind_speed: Math.random() * 15,
      pressure: 1013 + Math.random() * 20,
      source: 'weather_api'
    };
  } catch (error) {
    throw new Error('Weather data unavailable');
  }
}

async function checkOutbreakPattern(diseaseName, cropType, latitude, longitude, severityLevel) {
  try {
    // Check if there are similar cases nearby in the last 30 days
    const [nearbyCases] = await pool.execute(`
      SELECT COUNT(*) as case_count
      FROM analysis_history_enhanced 
      WHERE disease_name = ? 
        AND crop_type = ? 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * 
              cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * 
              sin( radians( latitude ) ) ) ) <= 10
    `, [diseaseName, cropType, latitude, longitude, latitude]);

    if (nearbyCases[0].case_count >= 3) {
      // Potential outbreak - create or update outbreak record
      await pool.execute(`
        INSERT INTO disease_outbreaks (
          disease_name, crop_type, latitude, longitude,
          severity_level, cases_count, status, first_reported_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'emerging', DATE(NOW()), NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          cases_count = cases_count + 1,
          last_updated_date = DATE(NOW()),
          updated_at = NOW()
      `, [diseaseName, cropType, latitude, longitude, severityLevel, nearbyCases[0].case_count]);
    }

  } catch (error) {
    console.error('Error checking outbreak pattern:', error);
  }
}

async function sendAnalysisNotification(userId, analysisResult) {
  try {
    // Check user notification preferences
    const [preferences] = await pool.execute(`
      SELECT diagnosis_results, email_enabled, sms_enabled, push_enabled, email, phone_number
      FROM notification_preferences 
      WHERE user_id = ?
    `, [userId]);

    if (preferences.length === 0 || !preferences[0].diagnosis_results) {
      return; // User doesn't want notifications
    }

    const userPrefs = preferences[0];
    let message = `Plant analysis complete: `;
    
    if (analysisResult.is_healthy) {
      message += `Your ${analysisResult.crop_type} appears healthy! 🌱`;
    } else {
      message += `${analysisResult.disease_name} detected in your ${analysisResult.crop_type}. `;
      message += `Severity: ${analysisResult.severity.level}. `;
      message += `Recommended action within ${analysisResult.severity.days_to_treat} days.`;
    }

    // Log notification (would integrate with actual notification service)
    await pool.execute(`
      INSERT INTO notification_log (
        user_id, analysis_id, notification_type, delivery_method,
        subject, message, status, created_at
      ) VALUES (?, ?, 'diagnosis', 'push', 'Analysis Complete', ?, 'sent', NOW())
    `, [userId, analysisResult.analysis_id, message]);

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

function translateAnalysisResult(result, lang = 'en') {
  // Use existing translation logic from original cropHealth.js
  const translations = require('./cropHealth').translations || {};
  const t = translations[lang] || translations.en;
  
  const predictedClass = result.predicted_class;
  const isHealthy = result.is_healthy || predictedClass.includes('healthy');
  
  let translatedResult = {
    is_healthy: isHealthy,
    confidence: result.confidence,
    predicted_class: predictedClass
  };

  if (!isHealthy) {
    translatedResult.disease_name = t?.diseases?.[predictedClass] || predictedClass;
    translatedResult.disease_type = predictedClass.includes('deficiency') ? 'deficiency' : 'disease';
    translatedResult.treatment = t?.treatments?.[predictedClass] || 'Consult with an agricultural expert for proper treatment.';
    
    if (predictedClass.includes('deficiency')) {
      const deficiencyType = predictedClass.toLowerCase();
      translatedResult.nutrients = t?.nutrients?.[deficiencyType] || t?.nutrients?.nitrogen_deficiency;
    }
  }

  return translatedResult;
}

function determineCropType(predictedClass) {
  if (predictedClass.includes('Apple')) return 'Apple';
  if (predictedClass.includes('Blueberry')) return 'Blueberry';
  if (predictedClass.includes('Cherry')) return 'Cherry';
  if (predictedClass.includes('Corn')) return 'Corn';
  if (predictedClass.includes('Grape')) return 'Grape';
  if (predictedClass.includes('Orange')) return 'Orange';
  if (predictedClass.includes('Peach')) return 'Peach';
  if (predictedClass.includes('Pepper')) return 'Pepper';
  if (predictedClass.includes('Potato')) return 'Potato';
  if (predictedClass.includes('Raspberry')) return 'Raspberry';
  if (predictedClass.includes('Soybean')) return 'Soybean';
  if (predictedClass.includes('Squash')) return 'Squash';
  if (predictedClass.includes('Strawberry')) return 'Strawberry';
  if (predictedClass.includes('Tomato')) return 'Tomato';
  return 'Unknown';
}

function determineSeason(environmentalData) {
  // Simple season determination based on temperature and rainfall
  if (environmentalData.temperature > 25 && environmentalData.rainfall < 50) {
    return 'dry';
  } else if (environmentalData.rainfall > 100) {
    return 'wet';
  } else {
    return 'transition';
  }
}

module.exports = router;
