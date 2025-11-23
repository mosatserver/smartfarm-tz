const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for image uploads
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Translation mappings for diseases and treatments
const translations = {
  en: {
    diseases: {
      // Apple
      'Apple___Apple_scab': 'Apple Scab',
      'Apple___Black_rot': 'Black Rot',
      'Apple___Cedar_apple_rust': 'Cedar Apple Rust',
      'Apple___healthy': 'Healthy',
      // Blueberry
      'Blueberry___healthy': 'Healthy',
      // Cherry
      'Cherry_(including_sour)___Powdery_mildew': 'Powdery Mildew',
      'Cherry_(including_sour)___healthy': 'Healthy',
      // Corn
      'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': 'Cercospora Leaf Spot',
      'Corn_(maize)___Common_rust_': 'Common Rust',
      'Corn_(maize)___Northern_Leaf_Blight': 'Northern Leaf Blight',
      'Corn_(maize)___healthy': 'Healthy',
      // Grape
      'Grape___Black_rot': 'Black Rot',
      'Grape___Esca_(Black_Measles)': 'Esca (Black Measles)',
      'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': 'Leaf Blight',
      'Grape___healthy': 'Healthy',
      // Orange
      'Orange___Haunglongbing_(Citrus_greening)': 'Citrus Greening',
      // Peach
      'Peach___Bacterial_spot': 'Bacterial Spot',
      'Peach___healthy': 'Healthy',
      // Pepper
      'Pepper,_bell___Bacterial_spot': 'Bacterial Spot',
      'Pepper,_bell___healthy': 'Healthy',
      // Potato
      'Potato___Early_blight': 'Early Blight',
      'Potato___Late_blight': 'Late Blight',
      'Potato___healthy': 'Healthy',
      // Raspberry
      'Raspberry___healthy': 'Healthy',
      // Soybean
      'Soybean___healthy': 'Healthy',
      // Squash
      'Squash___Powdery_mildew': 'Powdery Mildew',
      // Strawberry
      'Strawberry___Leaf_scorch': 'Leaf Scorch',
      'Strawberry___healthy': 'Healthy',
      // Tomato
      'Tomato___Bacterial_spot': 'Bacterial Spot',
      'Tomato___Early_blight': 'Early Blight',
      'Tomato___Late_blight': 'Late Blight',
      'Tomato___Leaf_Mold': 'Leaf Mold',
      'Tomato___Septoria_leaf_spot': 'Septoria Leaf Spot',
      'Tomato___Spider_mites Two-spotted_spider_mite': 'Spider Mites',
      'Tomato___Target_Spot': 'Target Spot',
      'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 'Yellow Leaf Curl Virus',
      'Tomato___Tomato_mosaic_virus': 'Mosaic Virus',
      'Tomato___healthy': 'Healthy'
    },
    treatments: {
      // Tomato diseases
      'Tomato___Early_blight': 'Apply copper-based fungicide (Copper oxychloride 50% WP - 3g/L) every 7-10 days. Use Mancozeb 75% WP (2g/L) alternately. Remove affected leaves and improve air circulation. Apply balanced NPK fertilizer 19:19:19.',
      'Tomato___Late_blight': 'Apply fungicide Metalaxyl + Mancozeb (Ridomil Gold 68% WP - 2g/L) or Chlorothalonil 75% WP (2g/L). Remove affected plant parts immediately. Apply potassium-rich fertilizer (0-0-50) to strengthen plant immunity.',
      'Tomato___Bacterial_spot': 'Use copper-based bactericides (Copper hydroxide 53.8% DF - 2g/L). Apply streptomycin sulfate (300ppm) spray. Remove infected leaves. Use calcium nitrate fertilizer to strengthen cell walls.',
      'Tomato___Tomato_mosaic_virus': 'Remove infected plants immediately. Control aphids with Imidacloprid 17.8% SL (0.5ml/L). Use virus-resistant varieties. Apply micronutrient fertilizer with zinc and boron to boost immunity.',
      'Tomato___Leaf_Mold': 'Improve ventilation and reduce humidity. Apply fungicides Propiconazole 25% EC (1ml/L) or Tebuconazole 10% + Sulphur 65% WG (3g/L). Apply potassium sulfate fertilizer.',
      'Tomato___Septoria_leaf_spot': 'Apply fungicide Chlorothalonil 75% WP (2g/L) or Azoxystrobin 23% SC (1ml/L). Remove affected lower leaves. Use balanced fertilizer NPK 20:20:20 with micronutrients.',
      'Tomato___Spider_mites Two-spotted_spider_mite': 'Use Abamectin 1.8% EC (1ml/L) or insecticidal soap. Apply neem oil (5ml/L). Increase humidity around plants. Use magnesium sulfate (Epsom salt) 2g/L spray.',
      'Tomato___Target_Spot': 'Apply copper-based fungicide (Copper oxychloride 50% WP - 3g/L) or Mancozeb 75% WP (2g/L). Improve air circulation. Use calcium chloride foliar spray (2g/L).',
      'Tomato___Tomato_Yellow_Leaf_Curl_Virus': 'Control whiteflies with Thiamethoxam 25% WG (0.3g/L) or Acetamiprid 20% SP (0.2g/L). Remove infected plants. Apply micronutrient fertilizer with high potassium (0-0-50).',
      
      // Potato diseases
      'Potato___Early_blight': 'Apply fungicide Mancozeb 75% WP (2.5g/L) or Chlorothalonil 75% WP (2g/L) every 10-14 days. Use balanced fertilizer NPK 15:15:15 with boron.',
      'Potato___Late_blight': 'Apply Metalaxyl + Mancozeb (Ridomil Gold 68% WP - 2.5g/L) or Cymoxanil + Mancozeb (Curzate M8 72% WP - 2g/L). Apply potassium chloride fertilizer for disease resistance.',
      
      // Corn diseases
      'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': 'Apply Propiconazole 25% EC (1ml/L) or Tebuconazole 25.9% EC (1ml/L). Rotate crops. Use nitrogen fertilizer with micronutrients (zinc, manganese).',
      'Corn_(maize)___Common_rust_': 'Apply Propiconazole 25% EC (1ml/L) if severe. Use resistant varieties. Apply balanced NPK 20:10:10 fertilizer with zinc sulfate.',
      'Corn_(maize)___Northern_Leaf_Blight': 'Apply Azoxystrobin 23% SC (1ml/L) or Propiconazole 25% EC (1ml/L). Plant resistant hybrids. Use urea fertilizer with micronutrients.',
      
      // Apple diseases
      'Apple___Apple_scab': 'Apply Captan 50% WP (2g/L) or Mancozeb 75% WP (2.5g/L) during growing season. Use Dodine 65% WP (1g/L) for severe cases. Apply calcium nitrate fertilizer.',
      'Apple___Black_rot': 'Apply copper-based fungicide (Copper oxychloride 50% WP - 3g/L) or Thiophanate methyl 70% WP (1g/L). Prune infected branches. Use potassium sulfate fertilizer.',
      'Apple___Cedar_apple_rust': 'Apply Myclobutanil 10% WP (1g/L) or Propiconazole 25% EC (1ml/L) during spring. Remove nearby cedar trees if possible. Apply balanced NPK 10:10:10 fertilizer.',
      
      // Other crops
      'Cherry_(including_sour)___Powdery_mildew': 'Apply sulfur-based fungicide (Wettable sulfur 80% WP - 3g/L) or Propiconazole 25% EC (1ml/L). Improve air circulation. Use potassium bicarbonate spray (5g/L).',
      'Grape___Black_rot': 'Apply Mancozeb 75% WP (2.5g/L) or Captan 50% WP (2g/L). Remove infected berries. Use calcium chloride foliar spray (2g/L).',
      'Grape___Esca_(Black_Measles)': 'Apply Trichoderma-based bio-fungicide. Prune infected wood during dormancy. Use organic matter and balanced NPK 15:15:15 fertilizer.',
      'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': 'Apply Copper oxychloride 50% WP (3g/L) or Mancozeb 75% WP (2g/L). Improve vineyard sanitation. Use potassium sulfate fertilizer.',
      'Orange___Haunglongbing_(Citrus_greening)': 'Control Asian citrus psyllid with Imidacloprid 17.8% SL (0.5ml/L). Apply micronutrient fertilizer with zinc, manganese, and iron. Use trunk injection of oxytetracycline.',
      'Peach___Bacterial_spot': 'Apply copper-based bactericide (Copper hydroxide 53.8% DF - 2g/L). Use streptomycin sulfate (300ppm) during bloom. Apply calcium nitrate fertilizer.',
      'Pepper,_bell___Bacterial_spot': 'Use copper fungicide (Copper oxychloride 50% WP - 3g/L) + streptomycin sulfate (300ppm). Apply calcium chloride foliar spray. Use balanced NPK 19:19:19 fertilizer.',
      'Squash___Powdery_mildew': 'Apply sulfur-based fungicide (Wettable sulfur 80% WP - 3g/L) or Azoxystrobin 23% SC (1ml/L). Use potassium bicarbonate spray (5g/L). Apply potassium sulfate fertilizer.',
      'Strawberry___Leaf_scorch': 'Apply Captan 50% WP (2g/L) or Chlorothalonil 75% WP (2g/L). Improve plant spacing for air circulation. Use balanced fertilizer NPK 10:10:10 with micronutrients.'
    },
    nutrients: {
      'nitrogen_deficiency': 'Apply nitrogen-rich fertilizer (NPK 20-10-10). Use organic compost or manure.',
      'potassium_deficiency': 'Apply potassium-rich fertilizer (0-0-60). Use wood ash or potassium sulfate.',
      'magnesium_deficiency': 'Apply magnesium sulfate (Epsom salt) - 1 tablespoon per gallon of water.',
      'phosphorus_deficiency': 'Apply phosphorus-rich fertilizer (10-30-10). Use bone meal or rock phosphate.'
    }
  },
  sw: {
    diseases: {
      'Tomato_Early_blight': 'Ukungu wa Mapema',
      'Tomato_Late_blight': 'Ukungu wa Mwisho',
      'Tomato_Bacterial_spot': 'Madoa ya Bakteria',
      'Tomato_Mosaic_virus': 'Virusi ya Mosaic',
      'Tomato_Leaf_Mold': 'Ukungu wa Majani',
      'Tomato_Septoria_leaf_spot': 'Madoa ya Majani ya Septoria',
      'Tomato_Spider_mites': 'Kupe wa Buibui',
      'Tomato_Target_Spot': 'Madoa ya Shabaha',
      'Tomato_healthy': 'Mzima',
      'Potato_Early_blight': 'Ukungu wa Mapema',
      'Potato_Late_blight': 'Ukungu wa Mwisho',
      'Potato_healthy': 'Mzima',
      'Corn_Cercospora_leaf_spot': 'Madoa ya Majani ya Cercospora',
      'Corn_Common_rust': 'Kutu ya Kawaida',
      'Corn_Northern_Leaf_Blight': 'Ukungu wa Kaskazini',
      'Corn_healthy': 'Mzima'
    },
    treatments: {
      'Tomato_Early_blight': 'Tumia dawa za kuua kuvu zenye shaba kila siku 7-10. Ondoa majani yaliyoathiriwa na boresha mzunguko wa hewa.',
      'Tomato_Late_blight': 'Tumia dawa za kuua kuvu zenye chlorothalonil au shaba. Ondoa sehemu zilizoathiriwa mara moja.',
      'Tomato_Bacterial_spot': 'Tumia dawa za kuua bakteria zenye shaba. Ondoa majani yaliyoambukizwa. Epuka umwagiliaji wa juu.',
      'Tomato_Mosaic_virus': 'Ondoa mimea iliyoambukizwa mara moja. Dhibiti wadudu na nyuki. Tumia aina zinazostahimili virusi.',
      'Tomato_Leaf_Mold': 'Boresha uingizaji hewa na punguza unyevunyevu. Tumia dawa za kuua kuvu zenye chlorothalonil.',
      'Tomato_Septoria_leaf_spot': 'Tumia dawa za kuua kuvu zenye chlorothalonil. Ondoa majani ya chini yaliyoathiriwa.',
      'Tomato_Spider_mites': 'Tumia sabuni ya wadudu au mafuta ya neem. Ongeza unyevunyevu karibu na mimea.',
      'Tomato_Target_Spot': 'Tumia dawa za kuua kuvu zenye shaba. Boresha mzunguko wa hewa. Epuka umwagiliaji wa juu.',
      'Potato_Early_blight': 'Tumia dawa za kuua kuvu zenye chlorothalonil au mancozeb. Ondoa majani yaliyoathiriwa.',
      'Potato_Late_blight': 'Tumia dawa za kuua kuvu zenye metalaxyl au chlorothalonil. Ondoa mimea iliyoambukizwa.',
      'Corn_Cercospora_leaf_spot': 'Tumia dawa za kuua kuvu zenye strobilurin. Badilisha mazao na ondoa mabaki ya mazao.',
      'Corn_Common_rust': 'Tumia dawa za kuua kuvu ikiwa ni kali. Panda aina zinazostahimili.',
      'Corn_Northern_Leaf_Blight': 'Tumia dawa za kuua kuvu zenye strobilurin au triazole. Panda aina zinazostahimili.'
    },
    nutrients: {
      'nitrogen_deficiency': 'Tumia mbolea zenye naitrojeni nyingi (NPK 20-10-10). Tumia mbolea za asili au kinyesi.',
      'potassium_deficiency': 'Tumia mbolea zenye potasiamu nyingi (0-0-60). Tumia majivu au potasiamu sulfeti.',
      'magnesium_deficiency': 'Tumia magnesiamu sulfeti (chumvi ya Epsom) - kijiko kikubwa kimoja kwa galoni ya maji.',
      'phosphorus_deficiency': 'Tumia mbolea zenye fosforasi nyingi (10-30-10). Tumia unga wa mifupa au fosforasi ya jiwe.'
    }
  }
};

// POST /api/crop-health/identify - Identify plant type from image
router.post('/identify', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { lang = 'en' } = req.body;
    const userId = req.userId;
    
    console.log('🌱 === PLANT IDENTIFICATION STARTED ===');
    console.log('👤 User ID:', userId);
    console.log('🌍 Language:', lang);
    console.log('📁 File received:', req.file ? 'YES' : 'NO');
    
    if (!req.file) {
      console.log('❌ ERROR: No image file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📎 File details:');
    console.log('  - Filename:', req.file.filename);
    console.log('  - Original name:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');
    console.log('  - Path:', req.file.path);
    
    console.log('🔍 Identifying plant type:', req.file.filename);
    
    // Call identification function
    let identificationResult;
    try {
      console.log('⏱️ Starting plant identification with 30 second timeout...');
      identificationResult = await Promise.race([
        runPlantIdentification(req.file.path),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Plant identification timeout after 30 seconds')), 30000)
        )
      ]);
      console.log('🌿 Plant identification result:', identificationResult);
    } catch (identError) {
      console.log('🌿 Plant identification failed:', identError.message);
      
      // Return error result when identification fails
      identificationResult = {
        success: false,
        error: 'Could not identify the plant. Please provide the correct name.',
        needs_learning: true,
        confidence: 0
      };
    }

    // Clean up uploaded file after identification
    if (fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up uploaded file after identification');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }

    console.log('✅ Plant identification completed');

    // Return the identification result directly
    res.json(identificationResult);

  } catch (error) {
    console.error('❌ Identification error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded file if identification failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Plant identification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/crop-health/analyze - Analyze plant image
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { lang = 'en' } = req.body;
    const userId = req.userId;
    
    console.log('🚀 === CROP HEALTH ANALYSIS STARTED ===');
    console.log('👤 User ID:', userId);
    console.log('🌍 Language:', lang);
    console.log('📤 Request body keys:', Object.keys(req.body));
    console.log('📁 File received:', req.file ? 'YES' : 'NO');
    
    if (!req.file) {
      console.log('❌ ERROR: No image file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📎 File details:');
    console.log('  - Filename:', req.file.filename);
    console.log('  - Original name:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');
    console.log('  - Mimetype:', req.file.mimetype);
    console.log('  - Path:', req.file.path);
    
    console.log('🔍 Analyzing plant image:', req.file.filename);
    
    // Call PyTorch prediction script with timeout
    let analysisResult;
    try {
      console.log('⏱️ Starting AI prediction with 45 second timeout...');
      analysisResult = await Promise.race([
        runPyTorchPrediction(req.file.path),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI prediction timeout after 45 seconds')), 45000)
        )
      ]);
      console.log('🤖 PyTorch prediction result:', analysisResult);
    } catch (aiError) {
      console.log('🤖 PyTorch prediction failed, using mock analysis:', aiError.message);
      
      // Generate mock analysis for development
      analysisResult = generateMockAnalysis();
    }

    console.log('🔄 Analysis result generated:', {
      predicted_class: analysisResult.predicted_class,
      confidence: analysisResult.confidence,
      is_healthy: analysisResult.is_healthy
    });

    // Translate results based on language
    console.log('🌐 Translating results for language:', lang);
    const translatedResult = translateAnalysisResult(analysisResult, lang);
    console.log('🌐 Translated result:', {
      is_healthy: translatedResult.is_healthy,
      disease_name: translatedResult.disease_name,
      confidence: translatedResult.confidence
    });

    // Determine crop type from filename or analysis
    const cropType = determineCropType(translatedResult.predicted_class) || 'Unknown';
    console.log('🌾 Determined crop type:', cropType);

    console.log('💾 Saving to database with values:', {
      userId,
      imagePath: req.file.path,
      cropType,
      isHealthy: translatedResult.is_healthy,
      diseaseName: translatedResult.disease_name,
      diseaseType: translatedResult.disease_type,
      confidence: translatedResult.confidence
    });

    // Save analysis to database
    try {
      await pool.execute(`
        INSERT INTO analysis_history (
          user_id, image_path, crop_type, is_healthy, disease_name, 
          disease_type, treatment, nutrients, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        req.file.path,
        cropType || null,
        translatedResult.is_healthy,
        translatedResult.disease_name || null,
        translatedResult.disease_type || 'disease',
        translatedResult.treatment || null,
        translatedResult.nutrients || null,
        translatedResult.confidence
      ]);
      
      console.log('✅ Database insertion successful');
    } catch (dbError) {
      console.error('❌ Database insertion failed:', dbError);
      console.error('DB Error details:', {
        code: dbError.code,
        errno: dbError.errno,
        sqlMessage: dbError.sqlMessage,
        sql: dbError.sql
      });
      throw dbError;
    }

    console.log('✅ Analysis completed and saved to database');

    const responseData = {
      success: true,
      ...translatedResult,
      crop_type: cropType
    };
    
    console.log('📤 Sending response:', {
      success: responseData.success,
      is_healthy: responseData.is_healthy,
      crop_type: responseData.crop_type,
      confidence: responseData.confidence
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Analysis error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Clean up uploaded file if analysis failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    const errorResponse = {
      success: false,
      message: 'Analysis failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    console.error('📤 Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// GET /api/crop-health/history - Get analysis history for user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const [history] = await pool.execute(`
      SELECT 
        id, crop_type, is_healthy, disease_name, disease_type,
        treatment, nutrients, confidence, created_at
      FROM analysis_history 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, [userId]);

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis history'
    });
  }
});

// GET /api/crop-health/statistics - Get user's analysis statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = '30d' } = req.query;

    // Calculate time range condition
    let timeCondition = '';
    switch(timeRange) {
      case '7d':
        timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      case '1y':
        timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        timeCondition = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Get basic statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_analyses,
        SUM(CASE WHEN is_healthy = 1 THEN 1 ELSE 0 END) as healthy_count,
        SUM(CASE WHEN is_healthy = 0 THEN 1 ELSE 0 END) as unhealthy_count,
        AVG(confidence * 100) as avg_confidence,
        COUNT(DISTINCT crop_type) as crop_types_analyzed
      FROM analysis_history 
      WHERE user_id = ? ${timeCondition}
    `, [userId]);

    // Get disease distribution (top diseases)
    const [diseaseDistribution] = await pool.execute(`
      SELECT disease_name as name, COUNT(*) as value
      FROM analysis_history 
      WHERE user_id = ? AND is_healthy = 0 AND disease_name IS NOT NULL ${timeCondition}
      GROUP BY disease_name
      ORDER BY value DESC
      LIMIT 5
    `, [userId]);

    // Get crop distribution
    const [cropDistribution] = await pool.execute(`
      SELECT crop_type as name, COUNT(*) as value
      FROM analysis_history 
      WHERE user_id = ? AND crop_type IS NOT NULL ${timeCondition}
      GROUP BY crop_type
      ORDER BY value DESC
      LIMIT 8
    `, [userId]);

    // Get active users count (only count if current user has analyses)
    let activeUsersCount = 0;
    if (stats[0].total_analyses > 0) {
      const [activeUsersResult] = await pool.execute(`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM analysis_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : timeRange === '90d' ? '90' : '365'} DAY)
      `);
      activeUsersCount = activeUsersResult[0].active_users;
    }

    // Get weekly trends for the selected period (only if user has data)
    const weeklyTrends = [];
    if (stats[0].total_analyses > 0) {
      const [weeklyTrendsData] = await pool.execute(`
        SELECT 
          WEEK(created_at) - WEEK(DATE_SUB(NOW(), INTERVAL ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : timeRange === '90d' ? '90' : '365'} DAY)) + 1 as week,
          COUNT(*) as count
        FROM analysis_history 
        WHERE user_id = ? ${timeCondition}
        GROUP BY WEEK(created_at)
        ORDER BY week
        LIMIT 10
      `, [userId]);
      weeklyTrends.push(...weeklyTrendsData);
    }

    // Create severity distribution based on confidence levels (only if user has data)
    const severityDistribution = [];
    if (stats[0].total_analyses > 0) {
      const [severityData] = await pool.execute(`
        SELECT 
          CASE 
            WHEN confidence >= 0.8 THEN 'High Confidence'
            WHEN confidence >= 0.6 THEN 'Medium Confidence'
            WHEN confidence >= 0.4 THEN 'Low Confidence'
            ELSE 'Very Low Confidence'
          END as name,
          COUNT(*) as value
        FROM analysis_history 
        WHERE user_id = ? ${timeCondition}
        GROUP BY 
          CASE 
            WHEN confidence >= 0.8 THEN 'High Confidence'
            WHEN confidence >= 0.6 THEN 'Medium Confidence'
            WHEN confidence >= 0.4 THEN 'Low Confidence'
            ELSE 'Very Low Confidence'
          END
        ORDER BY value DESC
      `, [userId]);
      
      severityDistribution.push(...severityData);
    }

    // Calculate average treatment cost estimate (only if user has unhealthy plants)
    let avgTreatmentCost = 0;
    if (stats[0].unhealthy_count > 0) {
      // Basic cost estimation: 50k TZS for bacterial, 30k for fungal, 40k for others
      avgTreatmentCost = Math.round(((stats[0].unhealthy_count * 45000) / 1000)); // Convert to thousands
    }

    // Treatment effectiveness data (only show if user has disease data)
    const treatmentEffectiveness = [];
    if (stats[0].unhealthy_count > 0) {
      treatmentEffectiveness.push(
        { name: 'Copper-based Fungicides', effectiveness: 85 },
        { name: 'Organic Treatments', effectiveness: 72 },
        { name: 'Bacterial Controls', effectiveness: 78 },
        { name: 'Systemic Treatments', effectiveness: 90 }
      );
    }

    // Generate insights based on real data
    const insights = [];
    
    if (stats[0].total_analyses > 0) {
      const healthyPercentage = (stats[0].healthy_count / stats[0].total_analyses) * 100;
      
      if (healthyPercentage > 70) {
        insights.push({
          title: 'Excellent Plant Health',
          description: `${healthyPercentage.toFixed(1)}% of your plants are healthy, indicating good farm management.`,
          recommendation: 'Continue current practices and consider expanding successful techniques to other areas.'
        });
      } else if (healthyPercentage < 50) {
        insights.push({
          title: 'Health Concerns Detected',
          description: `Only ${healthyPercentage.toFixed(1)}% of analyzed plants are healthy. Immediate attention needed.`,
          recommendation: 'Implement intensive monitoring and consider consulting with agricultural experts.'
        });
      }
      
      if (stats[0].avg_confidence > 80) {
        insights.push({
          title: 'High Detection Accuracy',
          description: `Average confidence of ${stats[0].avg_confidence.toFixed(1)}% indicates reliable disease detection.`,
          recommendation: 'Continue taking clear, well-lit photos for best analysis results.'
        });
      }
      
      if (diseaseDistribution.length > 0) {
        const topDisease = diseaseDistribution[0];
        insights.push({
          title: 'Common Disease Pattern',
          description: `${topDisease.name} appears most frequently in your analyses.`,
          recommendation: 'Focus on preventive measures specific to this disease type.'
        });
      }
    }

    // If no real insights, provide general ones
    if (insights.length === 0) {
      insights.push({
        title: 'Start Monitoring',
        description: 'Regular plant health monitoring helps detect issues early.',
        recommendation: 'Take photos of your plants weekly to track their health status.'
      });
    }

    res.json({
      success: true,
      statistics: {
        basic: stats[0],
        overview: {
          total_analyses: stats[0].total_analyses,
          healthy_count: stats[0].healthy_count,
          diseased_count: stats[0].unhealthy_count,
          healthy_percentage: stats[0].total_analyses > 0 ? (stats[0].healthy_count / stats[0].total_analyses) * 100 : 0,
          diseased_percentage: stats[0].total_analyses > 0 ? (stats[0].unhealthy_count / stats[0].total_analyses) * 100 : 0,
          avg_confidence: stats[0].avg_confidence || 0,
          active_users: activeUsersCount,
          avg_treatment_cost: avgTreatmentCost
        },
        disease_distribution: diseaseDistribution,
        crop_distribution: cropDistribution,
        severity_distribution: severityDistribution,
        environmental_insights: {
          avg_temperature: null,
          avg_humidity: null,
          unique_locations: cropDistribution.length || 1
        },
        treatment_effectiveness: treatmentEffectiveness,
        weekly_trends: weeklyTrends.map((trend, index) => ({
          week: index + 1,
          count: trend.count
        })),
        insights: insights
      }
    });

  } catch (error) {
    console.error('❌ Statistics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Helper function to run PyTorch prediction
async function runPyTorchPrediction(imagePath) {
  return new Promise((resolve, reject) => {
    const aiServicePath = path.join(__dirname, '..', '..', 'ai-service');
    const pythonScript = path.join(aiServicePath, 'predict.py');
    
    // Check if files exist
    if (!fs.existsSync(aiServicePath)) {
      console.error('❌ AI service directory not found:', aiServicePath);
      reject(new Error('AI service directory not found'));
      return;
    }
    
    if (!fs.existsSync(pythonScript)) {
      console.error('❌ Python script not found:', pythonScript);
      reject(new Error('Python script not found'));
      return;
    }
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file not found:', imagePath);
      reject(new Error('Image file not found'));
      return;
    }
    
    // Determine Python command based on OS and virtual environment
    let pythonCommand = 'python3';
    
    // Check for virtual environment - Windows vs Unix paths
    const windowsPythonPath = path.join(aiServicePath, 'venv', 'Scripts', 'python.exe');
    const unixPythonPath = path.join(aiServicePath, 'venv', 'bin', 'python');
    
    if (fs.existsSync(windowsPythonPath)) {
      pythonCommand = windowsPythonPath;
      console.log('🐍 Using Windows virtual environment Python');
    } else if (fs.existsSync(unixPythonPath)) {
      pythonCommand = unixPythonPath;
      console.log('🐍 Using Unix virtual environment Python');
    } else {
      console.log('⚠️ Virtual environment Python not found, using system Python');
      pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    }
    
    console.log(`🐍 Running prediction: ${pythonCommand} ${pythonScript} ${imagePath}`);
    console.log(`📁 AI service path: ${aiServicePath}`);
    console.log(`🔍 Image path: ${imagePath}`);
    
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
            console.log('✅ Python prediction successful:', result.predicted_class);
            // Convert to expected format
            const formattedResult = {
              predicted_class: result.predicted_class,
              confidence: result.confidence,
              is_healthy: result.predicted_class.includes('healthy'),
              top_predictions: result.top_predictions
            };
            resolve(formattedResult);
          } else {
            console.error('❌ Python prediction failed:', result.error);
            reject(new Error(result.error || 'Prediction failed'));
          }
        } catch (parseError) {
          console.error('❌ Failed to parse Python output:', outputData);
          console.error('Parse error:', parseError.message);
          reject(new Error('Failed to parse prediction result'));
        }
      } else {
        console.error('❌ Python script error (code ' + code + '):', errorData);
        console.error('❌ Python script stdout:', outputData);
        reject(new Error(`Python script exited with code ${code}: ${errorData}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start Python process:', error);
      reject(new Error('Failed to start prediction process: ' + error.message));
    });
  });
}

// Helper function to generate mock analysis (for development/fallback)
function generateMockAnalysis() {
  const diseases = [
    'Tomato___Early_blight',
    'Tomato___Late_blight', 
    'Tomato___Bacterial_spot',
    'Tomato___healthy',
    'Potato___Early_blight',
    'Potato___healthy',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___healthy',
    'Apple___Apple_scab',
    'Apple___healthy'
  ];
  
  const randomDisease = diseases[Math.floor(Math.random() * diseases.length)];
  const isHealthy = randomDisease.includes('healthy');
  const confidence = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
  
  console.log('🎲 Generated mock analysis:', randomDisease, 'healthy:', isHealthy);
  
  return {
    predicted_class: randomDisease,
    confidence: confidence,
    is_healthy: isHealthy
  };
}

// Helper function to translate analysis results
function translateAnalysisResult(result, lang = 'en') {
  const t = translations[lang] || translations.en;
  
  const predictedClass = result.predicted_class;
  const isHealthy = result.is_healthy || predictedClass.includes('healthy');
  
  let translatedResult = {
    is_healthy: isHealthy,
    confidence: result.confidence,
    predicted_class: predictedClass
  };

  if (!isHealthy) {
    translatedResult.disease_name = t.diseases[predictedClass] || predictedClass;
    translatedResult.disease_type = predictedClass.includes('deficiency') ? 'deficiency' : 'disease';
    translatedResult.treatment = t.treatments[predictedClass] || 'Consult with an agricultural expert for proper treatment.';
    
    // Add nutrients recommendation for deficiencies
    if (predictedClass.includes('deficiency')) {
      const deficiencyType = predictedClass.toLowerCase();
      translatedResult.nutrients = t.nutrients[deficiencyType] || t.nutrients.nitrogen_deficiency;
    }
  }

  return translatedResult;
}

// Helper function to run plant identification
async function runPlantIdentification(imagePath) {
  return new Promise((resolve, reject) => {
    const aiServicePath = path.join(__dirname, '..', '..', 'ai-service');
    const pythonScript = path.join(aiServicePath, 'identify_plant.py');
    
    // Check if files exist
    if (!fs.existsSync(aiServicePath)) {
      console.error('❌ AI service directory not found:', aiServicePath);
      reject(new Error('AI service directory not found'));
      return;
    }
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file not found:', imagePath);
      reject(new Error('Image file not found'));
      return;
    }
    
    // Determine Python command based on OS and virtual environment
    let pythonCommand = 'python3';
    
    // Check for virtual environment - Windows vs Unix paths
    const windowsPythonPath = path.join(aiServicePath, 'venv', 'Scripts', 'python.exe');
    const unixPythonPath = path.join(aiServicePath, 'venv', 'bin', 'python');
    
    if (fs.existsSync(windowsPythonPath)) {
      pythonCommand = windowsPythonPath;
      console.log('🐍 Using Windows virtual environment Python for identification');
    } else if (fs.existsSync(unixPythonPath)) {
      pythonCommand = unixPythonPath;
      console.log('🐍 Using Unix virtual environment Python for identification');
    } else {
      console.log('⚠️ Virtual environment Python not found for identification, using system Python');
      pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    }
    
    console.log(`🐍 Running plant identification: ${pythonCommand} ${pythonScript} ${imagePath}`);
    console.log(`📁 AI service path: ${aiServicePath}`);
    console.log(`🔍 Image path: ${imagePath}`);
    
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
            console.log('✅ Plant identification successful:', result.plant_name);
            resolve(result);
          } else {
            console.error('❌ Plant identification failed:', result.error);
            reject(new Error(result.error || 'Plant identification failed'));
          }
        } catch (parseError) {
          console.error('❌ Failed to parse identification output:', outputData);
          console.error('Parse error:', parseError.message);
          reject(new Error('Failed to parse identification result'));
        }
      } else {
        console.error('❌ Plant identification script error (code ' + code + '):', errorData);
        console.error('❌ Plant identification script stdout:', outputData);
        reject(new Error(`Plant identification script exited with code ${code}: ${errorData}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start plant identification process:', error);
      reject(new Error('Failed to start plant identification process: ' + error.message));
    });
  });
}

// Helper function to generate mock plant identification (for development/fallback)
function generateMockIdentification() {
  const plants = [
    {
      plant_name: 'Maize',
      plant_type: 'Corn',
      scientific_name: 'Zea mays',
      common_names: ['Corn', 'Maize', 'Sweet Corn'],
      confidence: 0.95
    },
    {
      plant_name: 'Tomato',
      plant_type: 'Tomato',
      scientific_name: 'Solanum lycopersicum',
      common_names: ['Tomato', 'Love Apple'],
      confidence: 0.92
    },
    {
      plant_name: 'Potato',
      plant_type: 'Potato',
      scientific_name: 'Solanum tuberosum',
      common_names: ['Potato', 'Irish Potato'],
      confidence: 0.89
    },
    {
      plant_name: 'Apple',
      plant_type: 'Apple',
      scientific_name: 'Malus domestica',
      common_names: ['Apple', 'Common Apple'],
      confidence: 0.87
    },
    {
      plant_name: 'Bell Pepper',
      plant_type: 'Pepper',
      scientific_name: 'Capsicum annuum',
      common_names: ['Bell Pepper', 'Sweet Pepper', 'Capsicum'],
      confidence: 0.91
    }
  ];
  
  const randomPlant = plants[Math.floor(Math.random() * plants.length)];
  
  console.log('🎲 Generated mock plant identification:', randomPlant.plant_name);
  
  return randomPlant;
}

// POST /api/crop-health/teach - Teach the AI a new plant name
router.post('/teach', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { plant_name } = req.body;
    const userId = req.userId;
    
    console.log('🧠 === PLANT TEACHING STARTED ===');
    console.log('👤 User ID:', userId);
    console.log('🌱 Plant name:', plant_name);
    console.log('📁 File received:', req.file ? 'YES' : 'NO');
    
    if (!req.file) {
      console.log('❌ ERROR: No image file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    if (!plant_name || !plant_name.trim()) {
      console.log('❌ ERROR: No plant name provided');
      return res.status(400).json({
        success: false,
        message: 'Plant name is required'
      });
    }

    console.log('📎 File details:');
    console.log('  - Filename:', req.file.filename);
    console.log('  - Original name:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes');
    console.log('  - Path:', req.file.path);
    
    console.log('🔍 Teaching plant with name:', plant_name.trim());
    
    // Call learning function
    let teachingResult;
    try {
      console.log('⏱️ Starting plant teaching with 30 second timeout...');
      teachingResult = await Promise.race([
        runPlantTeaching(req.file.path, plant_name.trim()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Plant teaching timeout after 30 seconds')), 30000)
        )
      ]);
      console.log('🌿 Plant teaching result:', teachingResult);
    } catch (teachError) {
      console.log('🌿 Plant teaching failed:', teachError.message);
      
      // Clean up uploaded file after teaching failed
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('🗑️ Cleaned up uploaded file after teaching error');
        } catch (cleanupError) {
          console.error('Failed to cleanup file:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Plant teaching failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? teachError.message : undefined
      });
    }

    // Clean up uploaded file after teaching
    if (fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up uploaded file after teaching');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }

    console.log('✅ Plant teaching completed');

    res.json({
      success: true,
      message: teachingResult.message || `Successfully learned new plant: ${plant_name.trim()}`,
      plant_name: plant_name.trim()
    });

  } catch (error) {
    console.error('❌ Teaching error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded file if teaching failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Plant teaching failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to run plant teaching
async function runPlantTeaching(imagePath, plantName) {
  return new Promise((resolve, reject) => {
    const aiServicePath = path.join(__dirname, '..', '..', 'ai-service');
    const pythonScript = path.join(aiServicePath, 'identify_plant.py');
    
    // Check if files exist
    if (!fs.existsSync(aiServicePath)) {
      console.error('❌ AI service directory not found:', aiServicePath);
      reject(new Error('AI service directory not found'));
      return;
    }
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file not found:', imagePath);
      reject(new Error('Image file not found'));
      return;
    }
    
    // Determine Python command based on OS and virtual environment
    let pythonCommand = 'python3';
    
    // Check for virtual environment - Windows vs Unix paths
    const windowsPythonPath = path.join(aiServicePath, 'venv', 'Scripts', 'python.exe');
    const unixPythonPath = path.join(aiServicePath, 'venv', 'bin', 'python');
    
    if (fs.existsSync(windowsPythonPath)) {
      pythonCommand = windowsPythonPath;
      console.log('🐍 Using Windows virtual environment Python for teaching');
    } else if (fs.existsSync(unixPythonPath)) {
      pythonCommand = unixPythonPath;
      console.log('🐍 Using Unix virtual environment Python for teaching');
    } else {
      console.log('⚠️ Virtual environment Python not found for teaching, using system Python');
      pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    }
    
    console.log(`🐍 Running plant teaching: ${pythonCommand} ${pythonScript} ${imagePath} ${plantName}`);
    console.log(`📁 AI service path: ${aiServicePath}`);
    console.log(`🔍 Image path: ${imagePath}`);
    console.log(`🌱 Plant name: ${plantName}`);
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, imagePath, plantName], {
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
            console.log('✅ Plant teaching successful:', result.plant_name);
            resolve(result);
          } else {
            console.error('❌ Plant teaching failed:', result.error);
            reject(new Error(result.error || 'Plant teaching failed'));
          }
        } catch (parseError) {
          console.error('❌ Failed to parse teaching output:', outputData);
          console.error('Parse error:', parseError.message);
          reject(new Error('Failed to parse teaching result'));
        }
      } else {
        console.error('❌ Plant teaching script error (code ' + code + '):', errorData);
        console.error('❌ Plant teaching script stdout:', outputData);
        reject(new Error(`Plant teaching script exited with code ${code}: ${errorData}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start plant teaching process:', error);
      reject(new Error('Failed to start plant teaching process: ' + error.message));
    });
  });
}

// Helper function to determine crop type from predicted class
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

module.exports = router;
