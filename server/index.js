// server/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const admin   = require('firebase-admin');


// 1) Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:     process.env.FIREBASE_PROJECT_ID,
    clientEmail:   process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

// 2) Create Express app
const app = express();

// 3) Global middleware
app.use(cors());            // enable CORS first
app.use(express.json());    // parse JSON bodies

// 4) Auth middleware (protect everything under /api)
const { authenticate } = require('./controllers/authMiddleware');
app.use('/api', authenticate);

// 5) Mount routers
app.use('/api/calls', require('./routes/calls'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dispatcher', require('./routes/dispatcher'));
app.use('/api/field', require('./routes/fieldUnit'));

// 6) Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
