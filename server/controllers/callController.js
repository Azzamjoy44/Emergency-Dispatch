// server/controllers/callController.js
const admin = require('firebase-admin');
const db = admin.firestore();

async function logCall(req, res) {
  try {
    // 1) Only allow OPERATOR role
    if ((req.user && req.user.role) !== 'OPERATOR') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2) Validate input
    const { callerNumber, callerName, location, description } = req.body;
    if (!callerNumber || !location || !callerName) {
      return res
        .status(400)
        .json({ error: 'callerNumber, callerName, and location are required' });
    }

    // 3) Create the call document
    const docRef = await db.collection('calls').add({
      callerNumber,
      callerName,
      location,
      description: description || null,
      operatorID: req.user.uid,           // operator's uid
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      emergencyType: null,
      urgencyLevel: null,
      dispatcherID: null,                 // dispatcher who will assess the call
      assessedAt: null,                   // when the call was assessed
      status: 'NEW'                         // <-- new field
    });

    return res.status(201).json({ callID: docRef.id });
  } catch (err) {
    console.error('Error logging call:', err);
    return res.status(500).json({ error: 'Failed to log call' });
  }
}

module.exports = { logCall };
