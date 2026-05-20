const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/adrs/:adrId/comments
 * List comments for an ADR
 */
router.get('/:adrId/comments', authenticate, (req, res) => {
  try {
    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, u.username, u.full_name, u.avatar_color, u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.adr_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.adrId);

    res.json({ comments });
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/adrs/:adrId/comments
 * Add a comment to an ADR
 */
router.post('/:adrId/comments', authenticate, requireMinRole('developer'), (req, res) => {
  try {
    const db = getDb();
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Verify ADR exists
    const adr = db.prepare('SELECT id FROM adrs WHERE id = ?').get(req.params.adrId);
    if (!adr) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    const result = db.prepare(
      'INSERT INTO comments (adr_id, user_id, content) VALUES (?, ?, ?)'
    ).run(req.params.adrId, req.user.id, content.trim());

    const comment = db.prepare(`
      SELECT c.*, u.username, u.full_name, u.avatar_color, u.role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Comment added', comment });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/adrs/:adrId/comments/:commentId
 * Delete a comment (own comments or admin)
 */
router.delete('/:adrId/comments/:commentId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND adr_id = ?')
      .get(req.params.commentId, req.params.adrId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only the commenter or admin can delete
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete another user\'s comment' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
