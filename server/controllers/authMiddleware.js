// server/controllers/authMiddleware.js
const admin = require('firebase-admin');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ')
    ? authHeader.split('Bearer ')[1]
    : null;
  if (!idToken) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;  
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid auth token' });
  }
}

module.exports = { authenticate };
