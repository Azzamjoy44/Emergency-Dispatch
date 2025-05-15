// server/routes/calls.js
const express = require('express');
const router = express.Router();
const { logCall } = require('../controllers/callController');

// POST /api/calls => log a new call
router.post('/', logCall);

module.exports = router;
