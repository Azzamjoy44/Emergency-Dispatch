// server/controllers/dispatchController.js
const admin = require('firebase-admin');
const db    = admin.firestore();

// POST /api/dispatcher/dispatches
exports.createDispatch = async (req, res) => {
  if (req.user.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { callId, unitId } = req.body;
  if (!callId || !unitId) {
    return res.status(400).json({ error: 'callId and unitId required' });
  }
  try {
    const ts = admin.firestore.FieldValue.serverTimestamp();
    const dispRef = await db.collection('dispatches').add({
      callId,
      unitId,
      dispatchedBy: req.user.uid,
      dispatchTime: ts,
      status: 'SENT'
    });
    // update statuses
    await db.collection('field_units').doc(unitId)
      .update({ currentStatus: 'DISPATCHED' });
    await db.collection('calls').doc(callId)
      .update({ status: 'DISPATCHED' });

    return res.status(201).json({ dispatchId: dispRef.id });
  } catch (err) {
    console.error('createDispatch error', err);
    return res.status(500).json({ error: 'Failed to dispatch' });
  }
};


// list pending ("SENT") dispatches for this unit
exports.listDispatchesForUnit = async (req, res) => {
    if (req.user.role !== 'FIELD_UNIT') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const snap = await db
        .collection('dispatches')
        .where('unitId', '==', req.user.uid)
        .where('status', '==', 'SENT')
        .orderBy('dispatchTime', 'desc')
        .get();
  
      const dispatches = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return res.json({ dispatches });
    } catch (err) {
      console.error('listDispatchesForUnit error', err);
      return res.status(500).json({ error: 'Failed to fetch dispatches' });
    }
  };
  
  // confirm a dispatch
  exports.confirmDispatch = async (req, res) => {
    if (req.user.role !== 'FIELD_UNIT') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const dispatchId = req.params.id;
    try {
      // Update dispatch status
      await db.collection('dispatches').doc(dispatchId).update({
        status: 'CONFIRMED',
        confirmedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      // Mark call as IN_PROGRESS
      const dispSnap = await db.collection('dispatches').doc(dispatchId).get();
      const { callId, unitId } = dispSnap.data();
      await db.collection('calls').doc(callId).update({ status: 'IN_PROGRESS' });
      // Mark unit as BUSY
      await db.collection('field_units').doc(unitId)
        .update({ currentStatus: 'BUSY' });
  
      return res.json({ success: true });
    } catch (err) {
      console.error('confirmDispatch error', err);
      return res.status(500).json({ error: 'Failed to confirm' });
    }
  };

// get ongoing dispatch for this unit
exports.getOngoingDispatch = async (req, res) => {
  if (req.user.role !== 'FIELD_UNIT') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Look for CONFIRMED dispatch for this unit
    const snap = await db
      .collection('dispatches')
      .where('unitId', '==', req.user.uid)
      .where('status', '==', 'CONFIRMED')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ dispatch: null });
    }

    // Get related call information
    const dispatchDoc = snap.docs[0];
    const dispatchData = dispatchDoc.data();
    const callId = dispatchData.callId;
    
    const callSnap = await db.collection('calls').doc(callId).get();
    const callData = callSnap.exists ? callSnap.data() : null;

    const dispatch = {
      id: dispatchDoc.id,
      ...dispatchData,
      call: callData ? {
        id: callId,
        ...callData
      } : null
    };

    return res.json({ dispatch });
  } catch (err) {
    console.error('getOngoingDispatch error', err);
    return res.status(500).json({ error: 'Failed to fetch ongoing dispatch' });
  }
};