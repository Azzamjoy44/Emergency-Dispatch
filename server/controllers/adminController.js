const admin = require('firebase-admin');
const db    = admin.firestore();

// GET /api/admin/accounts
exports.getAccounts = async function(req, res) {
  try {
    if ((req.user||{}).role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch all users from all role-specific collections
    const collections = ['operators', 'dispatchers', 'field_units'];
    let allUsers = [];

    // Retrieve users from each collection and merge them
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const usersFromCollection = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      allUsers = [...allUsers, ...usersFromCollection];
    }

    return res.json({ users: allUsers });
  } catch (err) {
    console.error('getAccounts error', err);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

// POST /api/admin/accounts
exports.manageAccounts = async function(req, res) {
  try {
    if ((req.user||{}).role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { op, user } = req.body;

    // CREATE
    if (op === 'CREATE') {
      const { email, password, mobileNumber, role,
              name, birthdate, address, personalId } = user;

      let unitType;
      if (role === 'FIELD_UNIT') {
        unitType = user.unitType;
        if (!unitType) {
          return res
            .status(400)
            .json({ error: 'unitType is required for FIELD_UNIT' });
        }
      }
      // 1) create Auth user
      const userRecord = await admin.auth().createUser({ email, password });

      // 2) set role claim
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });

      // 3) prepare base data
      const baseData = {
        accountID:   userRecord.uid,
        email, mobileNumber, role,
        name, birthdate, address, personalId,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 4) Add field-unit specific data if needed
      const data = role === 'FIELD_UNIT'
        ? {
            ...baseData,
            unitType,
            currentStatus: 'NOT_AVAILABLE'
          }
        : baseData;

      // 5) Write to role-specific collection
      let colName;
      if (role === 'OPERATOR')    colName = 'operators';
      else if (role === 'DISPATCHER') colName = 'dispatchers';
      else if (role === 'FIELD_UNIT') colName = 'field_units';
      
      if (colName) {
        await db.collection(colName).doc(userRecord.uid).set(data);
      }

      return res.status(201).json({ id: userRecord.uid });
    }

    // UPDATE
    if (op === 'UPDATE') {
      const {
        id,
        email,
        password,
        mobileNumber,
        role,
        name,
        birthdate,
        address,
        personalId,
        unitType
      } = user;

      // FIELD_UNIT must carry unitType
      if (role === 'FIELD_UNIT' && !unitType) {
        return res
          .status(400)
          .json({ error: 'unitType is required for FIELD_UNIT' });
      }

      // preserve old status/location only if switching roles and becoming a field unit
      let oldData = {};
      if (role === 'FIELD_UNIT') {
        const oldSnap = await db.collection('field_units').doc(id).get();
        if (oldSnap.exists) {
          oldData = oldSnap.data();
        }
      }

      // update Auth user with email and password if provided
      const updateUserParams = { email };
      
      // Add password to update if provided
      if (password) {
        updateUserParams.password = password;
      }
      
      await admin.auth().updateUser(id, updateUserParams);
      await admin.auth().setCustomUserClaims(id, { role });

      // prepare base update data
      const baseUpdate = {
        email,
        mobileNumber,
        role,
        name,
        birthdate,
        address,
        personalId
      };

      // prepare role-specific data
      const updateData = role === 'FIELD_UNIT'
        ? {
            ...baseUpdate,
            unitType,
            currentStatus: oldData.currentStatus || 'NOT_AVAILABLE'
          }
        : baseUpdate;

      // remove from all role collections
      const allCollections = ['operators', 'dispatchers', 'field_units'];
      for (const c of allCollections) {
        await db.collection(c).doc(id).delete().catch(() => {});
      }

      // add to correct role collection
      const newCol = {
        OPERATOR:   'operators',
        DISPATCHER: 'dispatchers',
        FIELD_UNIT: 'field_units'
      }[role];

      if (newCol) {
        await db.collection(newCol).doc(id).set({
          ...updateData,
          accountID: id,
          lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return res.json({ id });
    }

    // DELETE
    if (op === 'DELETE') {
      const { id } = user;
      // Delete auth user
      await admin.auth().deleteUser(id);
      
      // Delete from all collections
      const collections = ['operators', 'dispatchers', 'field_units'];
      for (const c of collections) {
        await db.collection(c).doc(id).delete().catch(() => {});
      }
      
      return res.json({ id });
    }

    return res.status(400).json({ error: 'Unsupported operation' });
  } catch (err) {
    console.error('manageAccounts error', err);
    return res.status(500).json({ error: 'Account operation failed' });
  }
};
