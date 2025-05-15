// server/controllers/reportController.js
const admin = require('firebase-admin');
const db    = admin.firestore();

exports.submitReport = async (req, res) => {
  if (req.user.role !== 'FIELD_UNIT') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { dispatchId, reportDetails, completionTime } = req.body;
  if (!dispatchId || !reportDetails || !completionTime) {
    return res.status(400).json({ error: 'dispatchId, reportDetails & completionTime required' });
  }

  try {
    // Lookup dispatch to get callId, unitId
    const dispSnap = await db.collection('dispatches').doc(dispatchId).get();
    if (!dispSnap.exists) {
      return res.status(404).json({ error: 'Dispatch not found' });
    }
    const { callId, unitId } = dispSnap.data();

    // Parse the client-provided completion time into a Firestore Timestamp
    // Expected format: "YYYY-MM-DD HH:MM" or other date string that JavaScript can parse
    let interventionCompletionTime;
    try {
      // Try to parse the date and convert to Firestore Timestamp
      const completionDate = new Date(completionTime);
      // Validate the date is valid
      if (isNaN(completionDate.getTime())) {
        throw new Error('Invalid date format');
      }
      interventionCompletionTime = admin.firestore.Timestamp.fromDate(completionDate);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid completion time format' });
    }

    // Create report
    const rptRef = await db.collection('reports').add({
      callId,
      unitId,
      dispatchId,
      reportDetails,
      interventionCompletionTime,
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update statuses:
    await db.collection('dispatches').doc(dispatchId)
      .update({ status: 'COMPLETED' });
    await db.collection('calls').doc(callId)
      .update({ status: 'COMPLETED' });
    await db.collection('field_units').doc(unitId)
      .update({ currentStatus: 'AVAILABLE' });

    return res.status(201).json({ reportId: rptRef.id });
  } catch (err) {
    console.error('submitReport error', err);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
};
