const admin = require('firebase-admin');
const db = admin.firestore();

const COMMENTS_COLLECTION = 'comments';
const USERS_COLLECTION = 'users';

// Comment document structure
const commentSchema = {
  movieId: 'number',
  userId: 'string',
  username: 'string',
  name: 'string|null',
  photoURL: 'string|null',
  comment: 'string',
  createdAt: 'timestamp'
};

const addComment = async (req, res) => {
  const { movieId } = req.params;
  const { comment } = req.body;
  const userId = req.user.uid;

  if (!comment || !movieId) {
    return res.status(400).json({ error: 'Comment and movie ID are required' });
  }

  try {
    // Fetch user data from Firestore users collection
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Fetch Firebase Auth user for photoURL
    const authUser = await admin.auth().getUser(userId);

    // Prioritize Firestore username, then auth displayName, then email prefix
    const username = userData.username || authUser.displayName || authUser.email?.split('@')[0] || `User_${userId.slice(0, 8)}`;
    const name = userData.name || null;
    const photoURL = authUser.photoURL || null;

    const commentData = {
      movieId: parseInt(movieId),
      userId,
      username,
      name,
      photoURL,
      comment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`Adding comment for movieId: ${movieId}, userId: ${userId}, username: ${username}, photoURL: ${photoURL}`);
    const commentRef = await db.collection(COMMENTS_COLLECTION).add(commentData);
    console.log(`Comment added with ID: ${commentRef.id}`);

    res.status(201).json({ id: commentRef.id, ...commentData });
  } catch (error) {
    console.error('Error adding comment:', error.message);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

const getComments = async (req, res) => {
  const { movieId } = req.params;
  console.log(`Fetching comments for movieId: ${movieId}`);

  try {
    const snapshot = await db.collection(COMMENTS_COLLECTION)
      .where('movieId', '==', parseInt(movieId))
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      console.log(`No comments found for movieId: ${movieId}`);
      return res.json([]);
    }

    const comments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        username: data.username || data.name || 'Unknown User',
        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });

    console.log(`Found ${comments.length} comments for movieId: ${movieId}`);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    if (error.code === 'FAILED_PRECONDITION' && error.message.includes('requires an index')) {
      console.log('Firestore index required:', error.message);
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.uid;

  try {
    const commentRef = db.collection(COMMENTS_COLLECTION).doc(commentId);
    const comment = await commentRef.get();

    if (!comment.exists) {
      console.log(`Comment not found: ${commentId}`);
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.data().userId !== userId) {
      console.log(`Unauthorized delete attempt by userId: ${userId} for commentId: ${commentId}`);
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await commentRef.delete();
    console.log(`Comment deleted: ${commentId}`);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = { addComment, getComments, deleteComment };