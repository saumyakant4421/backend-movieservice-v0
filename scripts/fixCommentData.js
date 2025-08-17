const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const USERS_COLLECTION = 'users';
const COMMENTS_COLLECTION = 'comments';

async function fixCommentData() {
  const snapshot = await db.collection(COMMENTS_COLLECTION).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    // Remove userPhoto if present
    if (data.userPhoto) {
      updates.userPhoto = admin.firestore.FieldValue.delete();
    }

    // Fix username
    if (!data.username || data.username === 'Anonymous' || data.username === null) {
      try {
        // Check users collection
        const userDoc = await db.collection(USERS_COLLECTION).doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        // Check Firebase Auth
        const authUser = await admin.auth().getUser(data.userId);

        // Prioritize Firestore username, then auth displayName, then email prefix
        updates.username = userData.username || authUser.displayName || authUser.email?.split('@')[0] || `User_${data.userId.slice(0, 8)}`;
        updates.name = userData.name || null;
        updates.photoURL = authUser.photoURL || null;
      } catch (error) {
        console.error(`Error fetching user ${data.userId}:`, error);
        updates.username = `User_${data.userId.slice(0, 8)}`;
        updates.name = null;
        updates.photoURL = null;
      }
    }

    // Fix createdAt
    if (!data.createdAt || typeof data.createdAt !== 'object' || !('seconds' in data.createdAt)) {
      updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (Object.keys(updates).length > 0) {
      await db.collection(COMMENTS_COLLECTION).doc(doc.id).update(updates);
      console.log(`Updated document ${doc.id}:`, updates);
    }
  }
  console.log('Done');
}

fixCommentData().catch(console.error);