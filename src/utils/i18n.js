import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      back_to_home: "Back to Home",
      crop_health: "Crop Health",
      
      // Main page
      plant_health_diagnosis: "Plant Health Diagnosis",
      ai_powered_subtitle: "AI-powered disease detection and treatment recommendations",
      
      // Image upload section
      upload_or_capture: "Upload or Capture Plant Image",
      upload_from_device: "Upload from Device",
      take_photo: "Take Photo",
      choose_file: "Choose File",
      drag_drop_hint: "Drag and drop an image here, or click to select",
      supported_formats: "Supports: JPG, PNG, JPEG (Max 5MB)",
      
      // Analysis section
      analyze_health: "Analyze Plant Health",
      analyzing: "Analyzing...",
      analysis_complete: "Analysis Complete",
      
      // Results
      health_status: "Health Status",
      healthy: "Healthy",
      sick: "Sick",
      disease_detected: "Disease Detected",
      deficiency_detected: "Deficiency Detected",
      confidence_level: "Confidence Level",
      suggested_treatment: "Suggested Treatment",
      recommended_nutrients: "Recommended Nutrients",
      
      // History
      analysis_history: "Analysis History",
      view_history: "View History",
      no_history: "No analysis history yet",
      date: "Date",
      crop_type: "Crop Type",
      diagnosis: "Diagnosis",
      treatment: "Treatment",
      
      // Common diseases and treatments
      early_blight: "Early Blight",
      late_blight: "Late Blight",
      bacterial_spot: "Bacterial Spot",
      mosaic_virus: "Mosaic Virus",
      leaf_mold: "Leaf Mold",
      septoria_leaf_spot: "Septoria Leaf Spot",
      spider_mites: "Spider Mites",
      target_spot: "Target Spot",
      nitrogen_deficiency: "Nitrogen Deficiency",
      potassium_deficiency: "Potassium Deficiency",
      magnesium_deficiency: "Magnesium Deficiency",
      
      // Treatments
      apply_fungicide: "Apply copper-based fungicide and improve air circulation",
      remove_affected_leaves: "Remove affected leaves and apply organic fungicide",
      use_neem_oil: "Use neem oil spray and maintain proper plant spacing",
      apply_nitrogen: "Apply nitrogen-rich fertilizer (NPK 20-10-10)",
      apply_potassium: "Apply potassium-rich fertilizer and ensure proper watering",
      apply_magnesium: "Apply magnesium sulfate (Epsom salt) solution",
      
      // Language
      language: "Language",
      english: "English",
      swahili: "Swahili",
      
      // Error messages
      error_analyzing: "Error during analysis. Please try again.",
      error_upload: "Error uploading image. Please try again.",
      invalid_file: "Invalid file format. Please use JPG, PNG, or JPEG.",
      file_too_large: "File is too large. Maximum size is 5MB.",
      camera_error: "Camera access error. Please check permissions.",
      
      // Success messages
      analysis_saved: "Analysis saved to history",
      image_uploaded: "Image uploaded successfully"
    }
  },
  sw: {
    translation: {
      // Navigation
      back_to_home: "Rudi Nyumbani",
      crop_health: "Afya ya Mazao",
      
      // Main page
      plant_health_diagnosis: "Uchunguzi wa Afya ya Mimea",
      ai_powered_subtitle: "Uchunguzi wa magonjwa kwa kutumia akili bandia na mapendekezo ya matibabu",
      
      // Image upload section
      upload_or_capture: "Pakia au Piga Picha ya Mmea",
      upload_from_device: "Pakia kutoka Kifaa",
      take_photo: "Piga Picha",
      choose_file: "Chagua Faili",
      drag_drop_hint: "Buruta na udondosha picha hapa, au bofya kuchagua",
      supported_formats: "Inasaidia: JPG, PNG, JPEG (Juu ya 5MB)",
      
      // Analysis section
      analyze_health: "Chunguza Afya ya Mmea",
      analyzing: "Inachunguza...",
      analysis_complete: "Uchunguzi Umekamilika",
      
      // Results
      health_status: "Hali ya Afya",
      healthy: "Mzima",
      sick: "Mgonjwa",
      disease_detected: "Ugonjwa Umegunduliwa",
      deficiency_detected: "Upungavu Umegunduliwa",
      confidence_level: "Kiwango cha Uhakika",
      suggested_treatment: "Matibabu Yanayopendekezwa",
      recommended_nutrients: "Virutubisho Vinavyopendekezwa",
      
      // History
      analysis_history: "Historia ya Uchunguzi",
      view_history: "Ona Historia",
      no_history: "Hakuna historia ya uchunguzi bado",
      date: "Tarehe",
      crop_type: "Aina ya Zao",
      diagnosis: "Uchunguzi",
      treatment: "Matibabu",
      
      // Common diseases and treatments
      early_blight: "Ukungu wa Mapema",
      late_blight: "Ukungu wa Mwisho",
      bacterial_spot: "Madoa ya Bakteria",
      mosaic_virus: "Virusi ya Mosaic",
      leaf_mold: "Ukungu wa Majani",
      septoria_leaf_spot: "Madoa ya Majani ya Septoria",
      spider_mites: "Kupe wa Buibui",
      target_spot: "Madoa ya Shabaha",
      nitrogen_deficiency: "Upungavu wa Naitrojeni",
      potassium_deficiency: "Upungavu wa Potasiamu",
      magnesium_deficiency: "Upungavu wa Magnesiamu",
      
      // Treatments
      apply_fungicide: "Tumia dawa za kuua kuvu zenye shaba na boresha mzunguko wa hewa",
      remove_affected_leaves: "Ondoa majani yaliyoathiriwa na tumia dawa za asili za kuua kuvu",
      use_neem_oil: "Tumia mafuta ya neem na hakikisha nafasi ya kutosha kati ya mimea",
      apply_nitrogen: "Tumia mbolea zenye naitrojeni nyingi (NPK 20-10-10)",
      apply_potassium: "Tumia mbolea zenye potasiamu na hakikisha umwagiliaji mzuri",
      apply_magnesium: "Tumia sulufeti ya magnesiamu (chumvi ya Epsom) iliyoyeyushwa",
      
      // Language
      language: "Lugha",
      english: "Kiingereza",
      swahili: "Kiswahili",
      
      // Error messages
      error_analyzing: "Hitilafu wakati wa uchunguzi. Tafadhali jaribu tena.",
      error_upload: "Hitilafu ya kupakia picha. Tafadhali jaribu tena.",
      invalid_file: "Muundo wa faili haujakubaliwa. Tafadhali tumia JPG, PNG, au JPEG.",
      file_too_large: "Faili ni kubwa sana. Ukubwa wa juu ni 5MB.",
      camera_error: "Hitilafu ya kamera. Tafadhali angalia ruhusa.",
      
      // Success messages
      analysis_saved: "Uchunguzi umehifadhiwa kwenye historia",
      image_uploaded: "Picha imepakiwa kwa mafanikio"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
