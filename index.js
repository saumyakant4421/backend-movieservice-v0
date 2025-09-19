const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const movieRoutes = require('./routes/movieRoutes');
const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

dotenv.config();

const client = new SecretManagerServiceClient();

// Async function to load Firebase service account
async function loadFirebaseServiceAccount() {
  try {
    const [version] = await client.accessSecretVersion({
      name: 'projects/streamverse-movie-12345/secrets/firebase-service-account/versions/latest',  // Replace Project ID
    });
    const payload = version.payload.data.toString('utf8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('Error loading Firebase secret:', error);
    process.exit(1);
  }
}

// Initialize Firebase Admin SDK
async function initializeFirebase() {
  const serviceAccount = await loadFirebaseServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase initialized');
}

// Initialize app async
async function initApp() {
  await initializeFirebase();
  
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/api/movies', movieRoutes);
  app.use('/api/movies/comments', require('./routes/commentRoutes')); // Ensure this line is correct

  // Log mounted routes for debugging
  console.log('Mounted routes:');
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods).join(', ')} ${r.route.path}`);
    }
  });

  // Default error handler
  app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Handle 404s
  app.use((req, res) => {
    console.log(`Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Route ${req.url} not found` });
  });

  const PORT = process.env.PORT || 4001;
  app.listen(PORT, () => console.log(`Movie Service running on port ${PORT}`));

  process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
  process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
}

initApp();  // Call before app.listen