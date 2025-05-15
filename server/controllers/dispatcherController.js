// server/controllers/dispatcherController.js
const admin = require('firebase-admin');
const db    = admin.firestore();

// GET /api/dispatcher/calls?status=NEW|ASSESSED
exports.getCallsByStatus = async (req, res) => {
  if (req.user.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const status = req.query.status;
  if (!status) {
    return res.status(400).json({ error: 'status query required' });
  }
  try {
    let query = db
      .collection('calls')
      .where('status', '==', status);
    
    // If we're querying ASSESSED calls, only return those assessed by this dispatcher
    if (status === 'ASSESSED') {
      const assessedBy = req.query.assessedBy || req.user.uid;
      query = query.where('assessedBy', '==', assessedBy);
    }
    
    // Execute the query with sorting
    const snap = await query.orderBy('timestamp', 'desc').get();

    const calls = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return res.json({ calls });
  } catch (err) {
    console.error('getCallsByStatus error', err);
    return res.status(500).json({ error: 'Failed to fetch calls' });
  }
};

// PATCH /api/dispatcher/calls/:callId/assess
exports.assessCall = async (req, res) => {
  if (req.user.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { callId } = req.params;
  const { emergencyType, urgencyLevel, assessedBy } = req.body;
  if (!emergencyType || urgencyLevel == null) {
    return res.status(400).json({ error: 'Missing assessment fields' });
  }
  try {
    await db.collection('calls').doc(callId).update({
      emergencyType,
      urgencyLevel,
      status: 'ASSESSED',
      dispatcherID: req.user.uid,
      assessedBy: assessedBy || req.user.uid, // Use the provided assessedBy or default to current user
      assessedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('assessCall error', err);
    return res.status(500).json({ error: 'Failed to assess call' });
  }
};

// GET /api/dispatcher/units?emergencyType=POLICE|FIRE|EMS|OTHER
exports.listUnits = async (req, res) => {
  if (req.user.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const emergencyType = req.query.emergencyType;
    
    if (!emergencyType) {
      return res.status(400).json({ error: 'emergencyType query parameter is required' });
    }
    
    let query = db.collection('field_units')
      .where('currentStatus', '==', 'AVAILABLE');
    
    // Filter by unitType matching the emergencyType
    if (emergencyType === 'POLICE') {
      query = query.where('unitType', '==', 'POLICE');
    } else if (emergencyType === 'FIRE') {
      query = query.where('unitType', '==', 'FIRE');
    } else if (emergencyType === 'EMS') {
      query = query.where('unitType', '==', 'EMS');
    } else if (emergencyType === 'OTHER') {
      // For OTHER emergencies, we could potentially allow any available unit
      // or have specific units for miscellaneous emergencies
      query = query.where('unitType', '==', 'OTHER');
    }
    
    const snap = await query.get();

    const units = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return res.json({ units });
  } catch (err) {
    console.error('listUnits error', err);
    return res.status(500).json({ error: 'Failed to list units' });
  }
};
