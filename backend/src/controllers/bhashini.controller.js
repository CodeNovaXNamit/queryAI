const bhashini = require('../services/bhashini.service');

async function speakTokenStatus(req, res) {
  try {
    const result = await bhashini.synthesizeTokenStatus(req.body);
    res.json(result);
  } catch (err) {
    if (err.code === 'BHASHINI_NOT_CONFIGURED') {
      return res.status(err.statusCode || 503).json({
        error: err.message,
        code: err.code,
        fallbackAvailable: true,
      });
    }
    throw err;
  }
}

module.exports = {
  speakTokenStatus,
};
