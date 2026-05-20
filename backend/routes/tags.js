const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tags
 * List all tags with usage counts
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const tags = db.prepare(`
      SELECT t.*, COUNT(at.adr_id) as usage_count
      FROM tags t
      LEFT JOIN adr_tags at ON t.id = at.tag_id
      GROUP BY t.id
      ORDER BY usage_count DESC
    `).all();

    res.json({ tags });
  } catch (err) {
    console.error('List tags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name.toLowerCase(), color || '#6366f1');

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Tag created', tag });
  } catch (err) {
    console.error('Create tag error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
