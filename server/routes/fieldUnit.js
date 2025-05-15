// server/routes/fieldUnit.js
const express = require('express');
const {
  listDispatchesForUnit,
  confirmDispatch,
  getOngoingDispatch
} = require('../controllers/dispatchController');
const { submitReport } = require('../controllers/reportController');
const { updateStatus } = require('../controllers/fieldUnitController');

const router = express.Router();

// GET  /api/field/dispatches                => list SENT dispatches
router.get('/dispatches', listDispatchesForUnit);

// GET  /api/field/ongoing-dispatch          => get current ongoing dispatch
router.get('/ongoing-dispatch', getOngoingDispatch);

// POST /api/field/dispatches/:id/confirm    => confirm receipt
router.post('/dispatches/:id/confirm', confirmDispatch);

// POST /api/field/reports                  => submit intervention report
router.post('/reports', submitReport);

// PATCH /api/field/status                  => change your own currentStatus
router.patch('/status', updateStatus);

module.exports = router;
