const express = require('express');
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:movieId', authMiddleware, addComment); // Add a comment
router.get('/:movieId', getComments); // Get all comments for a movie
router.delete('/:commentId', authMiddleware, deleteComment); // Delete a comment

module.exports = router;