// server/routes/dispatcher.js
const express = require('express');
const {
  getCallsByStatus,
  assessCall,
  listUnits
} = require('../controllers/dispatcherController');
const { createDispatch } = require('../controllers/dispatchController');

const router = express.Router();

// list calls by status
router.get('/calls', getCallsByStatus);

// assess an emergency
router.patch('/calls/:callId/assess', assessCall);

// list available units
router.get('/units', listUnits);

// dispatch a unit
router.post('/dispatches', createDispatch);

module.exports = router;
