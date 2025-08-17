const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const movieRoutes = require('./routes/movieRoutes');
const admin = require('firebase-admin');

dotenv.config();

// Initialize Firebase Admin SDK
// const serviceAccount = require('./firebase-adminsdk.json'); // Update path if needed
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/movies', movieRoutes);
app.use('/api/comments', require('./routes/commentRoutes')); // Ensure this line is correct

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