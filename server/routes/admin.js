// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { getAccounts, manageAccounts } = require('../controllers/adminController');
const { generateReport } = require('../controllers/adminReportController');

// GET /api/admin/accounts => list all user profiles
router.get( '/accounts', getAccounts );

// POST /api/admin/accounts => create / update / delete
router.post('/accounts', manageAccounts);

// Reports
router.post('/reports', generateReport);

module.exports = router;
