const { body } = require('express-validator');

// Middleware to parse JSON strings from form data
const parseJSONFields = (req, res, next) => {
  try {
    console.log('🔍 parseJSONFields - Before parsing:', {
      tags: req.body.tags,
      learning_objectives: req.body.learning_objectives,
      tagsType: typeof req.body.tags,
      objectivesType: typeof req.body.learning_objectives
    });
    
    // Parse tags if it's a JSON string
    if (req.body.tags !== undefined && typeof req.body.tags === 'string') {
      try {
        const parsedTags = JSON.parse(req.body.tags);
        req.body.tags = Array.isArray(parsedTags) ? parsedTags : [];
        console.log('✅ Successfully parsed tags:', req.body.tags);
      } catch (e) {
        // If parsing fails, set empty array
        req.body.tags = [];
        console.log('❌ Failed to parse tags as JSON, setting empty array');
      }
    } else if (req.body.tags === undefined) {
      req.body.tags = [];
    }
    
    // Parse learning_objectives if it's a JSON string
    if (req.body.learning_objectives !== undefined && typeof req.body.learning_objectives === 'string') {
      try {
        const parsedObjectives = JSON.parse(req.body.learning_objectives);
        req.body.learning_objectives = Array.isArray(parsedObjectives) ? parsedObjectives : [];
        console.log('✅ Successfully parsed learning_objectives:', req.body.learning_objectives);
      } catch (e) {
        // If parsing fails, set empty array
        req.body.learning_objectives = [];
        console.log('❌ Failed to parse learning_objectives as JSON, setting empty array');
      }
    } else if (req.body.learning_objectives === undefined) {
      req.body.learning_objectives = [];
    }
    
    console.log('🔍 parseJSONFields - After parsing:', {
      tags: req.body.tags,
      learning_objectives: req.body.learning_objectives
    });
    
    next();
  } catch (error) {
    console.error('Error in parseJSONFields middleware:', error);
    next();
  }
};

// Course creation validation
const validateCourseCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\:\.\,\(\)]+$/)
    .withMessage('Course title contains invalid characters'),

  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters'),

  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Course level must be: beginner, intermediate, or advanced'),

  body('duration_weeks')
    .isInt({ min: 1, max: 52 })
    .withMessage('Course duration must be between 1 and 52 weeks'),

  body('price')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Price must not exceed 20 characters'),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Each tag must be between 2 and 30 characters'),

  body('prerequisites')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Prerequisites must not exceed 500 characters'),

  body('learning_objectives')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Learning objectives must be an array with maximum 20 items'),

  body('learning_objectives.*')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Each learning objective must be between 5 and 200 characters')
];

// Course update validation (all fields optional)
const validateCourseUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Course title must be between 5 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\:\.\,\(\)]+$/)
    .withMessage('Course title contains invalid characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Course description must be between 20 and 2000 characters'),

  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Course level must be: beginner, intermediate, or advanced'),

  body('duration_weeks')
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage('Course duration must be between 1 and 52 weeks'),

  body('price')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Price must not exceed 20 characters'),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Each tag must be between 2 and 30 characters'),

  body('prerequisites')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Prerequisites must not exceed 500 characters'),

  body('learning_objectives')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Learning objectives must be an array with maximum 20 items'),

  body('learning_objectives.*')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Each learning objective must be between 5 and 200 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be: draft, published, or archived')
];

// Course status update validation
const validateCourseStatus = [
  body('status')
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be: draft, published, or archived')
];

module.exports = {
  parseJSONFields,
  validateCourseCreation,
  validateCourseUpdate,
  validateCourseStatus
};
