// server/createAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:     process.env.FIREBASE_PROJECT_ID,
    clientEmail:   process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

async function bootstrapAdmin() {
  // 1) Create the Auth user
  const userRecord = await admin.auth().createUser({
    email: 'azzam@yahoo.com',
    password: '123456', 
    displayName: 'System Administrator',
  });

  // 2) Add custom‐claim so token = role:ADMIN
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'ADMIN' });

  // 3) Create Firestore profile
  const db = admin.firestore();
  await db.collection('system_administrators').doc(userRecord.uid).set({
    accountID:   userRecord.uid,
    email:       userRecord.email,
    role:        'ADMIN',
    displayName: userRecord.displayName,
    lastLogin:   admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('🛡️  Bootstrap complete — Admin UID:', userRecord.uid);
  process.exit(0);
}

bootstrapAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
