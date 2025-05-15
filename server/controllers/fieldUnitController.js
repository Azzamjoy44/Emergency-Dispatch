// server/controllers/fieldUnitController.js
const admin = require('firebase-admin');
const db    = admin.firestore();

exports.updateStatus = async (req, res) => {
  // only field units may call this
  if (req.user.role !== 'FIELD_UNIT') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { status } = req.body;
  if (!['AVAILABLE', 'NOT_AVAILABLE', 'BUSY', 'DISPATCHED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  const uid = req.user.uid;
  // update only the specialized "field_units" collection
  await db.collection('field_units').doc(uid).update({ currentStatus: status });
  return res.json({ status });
};
