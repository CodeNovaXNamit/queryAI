const router = require('express').Router();
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/bhashini.controller');

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many voice requests. Please wait a moment and try again.' },
});

const tokenStatusTtsSchema = Joi.object({
  tokenId: Joi.string().uuid().required(),
  language: Joi.string().pattern(/^[a-z]{2,3}$/).default(config.bhashini.defaultLanguage),
  gender: Joi.string().valid('male', 'female').default(config.bhashini.defaultGender),
});

router.post('/token-status-tts', ttsLimiter, validate(tokenStatusTtsSchema), asyncHandler(controller.speakTokenStatus));

module.exports = router;
