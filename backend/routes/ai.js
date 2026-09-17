const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { chatWithTutor } = require('../controllers/aiController');

// @route   POST /api/ai/chat
// @desc    Send multi-turn chat message to AI Tutor
// @access  Public
router.post(
  '/chat',
  [
    body('messages')
      .isArray({ min: 1 })
      .withMessage('Messages must be a non-empty array'),
    body('messages.*.role')
      .isIn(['user', 'assistant', 'system'])
      .withMessage('Message role must be user, assistant, or system'),
    body('messages.*.content')
      .trim()
      .notEmpty()
      .withMessage('Message content cannot be empty'),
  ],
  chatWithTutor
);

module.exports = router;
