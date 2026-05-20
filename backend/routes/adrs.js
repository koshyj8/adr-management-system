const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');
const { getNextAdrNumber, paginate } = require('../utils/helpers');
const { findSimilarADRs } = require('../ai/similarity');
const { suggestTags } = require('../ai/autotag');
const { predictImpact } = require('../ai/impact');

const router = express.Router();

/**
 * GET /api/adrs
 * List all ADRs with filtering, search, and pagination
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { status, tag, author, search, page = 1, limit = 20, sort = 'newest' } = req.query;

    let query = `
      SELECT a.*, u.username as author_name, u.full_name as author_full_name, u.avatar_color as author_color,
        (SELECT COUNT(*) FROM comments c WHERE c.adr_id = a.id) as comment_count,
        (SELECT COUNT(*) FROM adr_reviews r WHERE r.adr_id = a.id) as review_count
      FROM adrs a
      JOIN users u ON a.author_id = u.id
    `;
    const conditions = [];
    const params = [];

    // Full-text search
    if (search) {
      query = `
        SELECT a.*, u.username as author_name, u.full_name as author_full_name, u.avatar_color as author_color,
          (SELECT COUNT(*) FROM comments c WHERE c.adr_id = a.id) as comment_count,
          (SELECT COUNT(*) FROM adr_reviews r WHERE r.adr_id = a.id) as review_count
        FROM adrs a
        JOIN users u ON a.author_id = u.id
        JOIN adrs_fts fts ON a.id = fts.rowid
        WHERE adrs_fts MATCH ?
      `;
      params.push(search + '*');
    }

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (author) {
      conditions.push('a.author_id = ?');
      params.push(parseInt(author));
    }

    if (tag) {
      conditions.push('a.id IN (SELECT adr_id FROM adr_tags JOIN tags ON tags.id = adr_tags.tag_id WHERE tags.name = ?)');
      params.push(tag);
    }

    if (conditions.length > 0) {
      query += (search ? ' AND ' : ' WHERE ') + conditions.join(' AND ');
    }

    // Sorting
    const sortMap = {
      newest: 'a.created_at DESC',
      oldest: 'a.created_at ASC',
      number: 'a.adr_number ASC',
      updated: 'a.updated_at DESC',
      title: 'a.title ASC',
    };
    query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;

    // Pagination
    const { limit: lim, offset } = paginate(parseInt(page), parseInt(limit));
    query += ` LIMIT ? OFFSET ?`;
    params.push(lim, offset);

    const adrs = db.prepare(query).all(...params);

    // Get tags for each ADR
    const getTagsStmt = db.prepare(`
      SELECT t.id, t.name, t.color FROM tags t
      JOIN adr_tags at ON t.id = at.tag_id
      WHERE at.adr_id = ?
    `);

    const adrsWithTags = adrs.map(adr => ({
      ...adr,
      tags: getTagsStmt.all(adr.id),
    }));

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM adrs a';
    const countParams = [];
    if (status) {
      countQuery += ' WHERE a.status = ?';
      countParams.push(status);
    }
    const total = db.prepare(countQuery).get(...countParams);

    res.json({
      adrs: adrsWithTags,
      pagination: {
        page: parseInt(page),
        limit: lim,
        total: total.total,
        totalPages: Math.ceil(total.total / lim),
      },
    });
  } catch (err) {
    console.error('List ADRs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/adrs/:id
 * Get single ADR with full details
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const adr = db.prepare(`
      SELECT a.*, u.username as author_name, u.full_name as author_full_name, u.avatar_color as author_color
      FROM adrs a
      JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!adr) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    // Get tags
    const tags = db.prepare(`
      SELECT t.id, t.name, t.color FROM tags t
      JOIN adr_tags at ON t.id = at.tag_id
      WHERE at.adr_id = ?
    `).all(adr.id);

    // Get relations
    const relations = db.prepare(`
      SELECT r.*, 
        sa.adr_number as source_number, sa.title as source_title, sa.status as source_status,
        ta.adr_number as target_number, ta.title as target_title, ta.status as target_status
      FROM adr_relations r
      JOIN adrs sa ON r.source_adr_id = sa.id
      JOIN adrs ta ON r.target_adr_id = ta.id
      WHERE r.source_adr_id = ? OR r.target_adr_id = ?
    `).all(adr.id, adr.id);

    // Get reviews
    const reviews = db.prepare(`
      SELECT r.*, u.username, u.full_name, u.avatar_color
      FROM adr_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.adr_id = ?
      ORDER BY r.created_at DESC
    `).all(adr.id);

    // Get version count
    const versionCount = db.prepare('SELECT COUNT(*) as count FROM adr_versions WHERE adr_id = ?').get(adr.id);

    // Get comment count
    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE adr_id = ?').get(adr.id);

    res.json({
      adr: {
        ...adr,
        tags,
        relations,
        reviews,
        version_count: versionCount.count,
        comment_count: commentCount.count,
      },
    });
  } catch (err) {
    console.error('Get ADR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/adrs
 * Create a new ADR
 */
router.post('/', authenticate, requireMinRole('developer'), (req, res) => {
  try {
    const db = getDb();
    const { title, context, decision, consequences, alternatives, tags: tagIds } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const adr_number = getNextAdrNumber(db);

    const result = db.prepare(`
      INSERT INTO adrs (adr_number, title, status, context, decision, consequences, alternatives, author_id)
      VALUES (?, ?, 'Proposed', ?, ?, ?, ?, ?)
    `).run(adr_number, title, context || '', decision || '', consequences || '', alternatives || '', req.user.id);

    const adrId = result.lastInsertRowid;

    // Add tags
    if (tagIds && tagIds.length > 0) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO adr_tags (adr_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        insertTag.run(adrId, tagId);
      }
    }

    // Create initial version
    db.prepare(`
      INSERT INTO adr_versions (adr_id, version_number, title, status, context, decision, consequences, alternatives, changed_by, change_summary)
      VALUES (?, 1, ?, 'Proposed', ?, ?, ?, ?, ?, 'Initial creation')
    `).run(adrId, title, context || '', decision || '', consequences || '', alternatives || '', req.user.id);

    const adr = db.prepare(`
      SELECT a.*, u.username as author_name, u.full_name as author_full_name
      FROM adrs a JOIN users u ON a.author_id = u.id WHERE a.id = ?
    `).get(adrId);

    res.status(201).json({ message: 'ADR created successfully', adr });
  } catch (err) {
    console.error('Create ADR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/adrs/:id
 * Update an ADR (creates a new version)
 */
router.put('/:id', authenticate, requireMinRole('developer'), (req, res) => {
  try {
    const db = getDb();
    const { title, context, decision, consequences, alternatives, tags: tagIds, change_summary } = req.body;

    const existing = db.prepare('SELECT * FROM adrs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    // Update ADR
    db.prepare(`
      UPDATE adrs SET title = ?, context = ?, decision = ?, consequences = ?, alternatives = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      context !== undefined ? context : existing.context,
      decision !== undefined ? decision : existing.decision,
      consequences !== undefined ? consequences : existing.consequences,
      alternatives !== undefined ? alternatives : existing.alternatives,
      req.params.id
    );

    // Create version entry
    const versionCount = db.prepare('SELECT MAX(version_number) as max_ver FROM adr_versions WHERE adr_id = ?').get(req.params.id);
    const nextVersion = (versionCount.max_ver || 0) + 1;

    db.prepare(`
      INSERT INTO adr_versions (adr_id, version_number, title, status, context, decision, consequences, alternatives, changed_by, change_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, nextVersion,
      title || existing.title, existing.status,
      context !== undefined ? context : existing.context,
      decision !== undefined ? decision : existing.decision,
      consequences !== undefined ? consequences : existing.consequences,
      alternatives !== undefined ? alternatives : existing.alternatives,
      req.user.id, change_summary || 'Updated'
    );

    // Update tags if provided
    if (tagIds) {
      db.prepare('DELETE FROM adr_tags WHERE adr_id = ?').run(req.params.id);
      const insertTag = db.prepare('INSERT OR IGNORE INTO adr_tags (adr_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        insertTag.run(req.params.id, tagId);
      }
    }

    const adr = db.prepare(`
      SELECT a.*, u.username as author_name, u.full_name as author_full_name
      FROM adrs a JOIN users u ON a.author_id = u.id WHERE a.id = ?
    `).get(req.params.id);

    res.json({ message: 'ADR updated successfully', adr });
  } catch (err) {
    console.error('Update ADR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/adrs/:id/status
 * Change ADR status
 */
router.patch('/:id/status', authenticate, requireMinRole('architect'), (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['Proposed', 'Accepted', 'Deprecated', 'Superseded'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = db.prepare('SELECT * FROM adrs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    db.prepare('UPDATE adrs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

    // Create version entry for status change
    const versionCount = db.prepare('SELECT MAX(version_number) as max_ver FROM adr_versions WHERE adr_id = ?').get(req.params.id);
    const nextVersion = (versionCount.max_ver || 0) + 1;

    db.prepare(`
      INSERT INTO adr_versions (adr_id, version_number, title, status, context, decision, consequences, alternatives, changed_by, change_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, nextVersion, existing.title, status,
      existing.context, existing.decision, existing.consequences, existing.alternatives,
      req.user.id, `Status changed from ${existing.status} to ${status}`
    );

    res.json({ message: `ADR status updated to ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/adrs/:id
 * Delete an ADR (admin only)
 */
router.delete('/:id', authenticate, requireMinRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM adrs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    db.prepare('DELETE FROM adrs WHERE id = ?').run(req.params.id);
    res.json({ message: 'ADR deleted successfully' });
  } catch (err) {
    console.error('Delete ADR error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/adrs/:id/versions
 * Get version history for an ADR
 */
router.get('/:id/versions', authenticate, (req, res) => {
  try {
    const db = getDb();
    const versions = db.prepare(`
      SELECT v.*, u.username, u.full_name, u.avatar_color
      FROM adr_versions v
      JOIN users u ON v.changed_by = u.id
      WHERE v.adr_id = ?
      ORDER BY v.version_number DESC
    `).all(req.params.id);

    res.json({ versions });
  } catch (err) {
    console.error('Get versions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/adrs/:id/relations
 * Create a relation between ADRs
 */
router.post('/:id/relations', authenticate, requireMinRole('developer'), (req, res) => {
  try {
    const db = getDb();
    const { target_adr_id, relation_type } = req.body;
    const validTypes = ['supersedes', 'related-to', 'depends-on'];

    if (!validTypes.includes(relation_type)) {
      return res.status(400).json({ error: `Invalid relation type. Must be: ${validTypes.join(', ')}` });
    }

    db.prepare('INSERT INTO adr_relations (source_adr_id, target_adr_id, relation_type) VALUES (?, ?, ?)')
      .run(req.params.id, target_adr_id, relation_type);

    res.status(201).json({ message: 'Relation created' });
  } catch (err) {
    console.error('Create relation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/adrs/:id/reviews
 * Submit a review for an ADR
 */
router.post('/:id/reviews', authenticate, requireMinRole('architect'), (req, res) => {
  try {
    const db = getDb();
    const { decision, comment } = req.body;
    const validDecisions = ['approved', 'rejected', 'needs-changes'];

    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: `Invalid decision. Must be: ${validDecisions.join(', ')}` });
    }

    db.prepare('INSERT INTO adr_reviews (adr_id, reviewer_id, decision, comment) VALUES (?, ?, ?, ?)')
      .run(req.params.id, req.user.id, decision, comment || '');

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/search
 * Full-text search across ADRs
 */
router.get('/search/query', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = db.prepare(`
      SELECT a.id, a.adr_number, a.title, a.status, a.created_at,
        u.username as author_name, u.full_name as author_full_name
      FROM adrs a
      JOIN users u ON a.author_id = u.id
      JOIN adrs_fts fts ON a.id = fts.rowid
      WHERE adrs_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `).all(q + '*');

    res.json({ results, query: q });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// AI-POWERED ENDPOINTS
// ============================================================

/**
 * POST /api/adrs/ai/similar
 * AI-01: Similarity Detection
 * Find existing ADRs similar to the given text
 */
router.post('/ai/similar', authenticate, (req, res) => {
  try {
    const { title, context, decision, consequences, alternatives, excludeId } = req.body;

    // Combine all text fields
    const text = [title, context, decision, consequences, alternatives]
      .filter(Boolean)
      .join(' ');

    if (!text || text.trim().length < 10) {
      return res.json({ similar: [], message: 'Not enough text for analysis' });
    }

    const similar = findSimilarADRs(text, excludeId || null, 5, 0.10);

    res.json({
      similar,
      algorithm: 'TF-IDF + Cosine Similarity',
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Similarity error:', err);
    res.status(500).json({ error: 'Similarity analysis failed' });
  }
});

/**
 * POST /api/adrs/ai/autotag
 * AI-02: Auto-Tagging
 * Suggest tags based on ADR content
 */
router.post('/ai/autotag', authenticate, (req, res) => {
  try {
    const { title, context, decision, consequences, alternatives } = req.body;

    const text = [title, context, decision, consequences, alternatives]
      .filter(Boolean)
      .join(' ');

    if (!text || text.trim().length < 10) {
      return res.json({ tags: [], message: 'Not enough text for analysis' });
    }

    const tags = suggestTags(text, 5, 15);

    res.json({
      tags,
      algorithm: 'Keyword-based Multi-label Classifier with TF-IDF',
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI Auto-tag error:', err);
    res.status(500).json({ error: 'Auto-tagging failed' });
  }
});

/**
 * GET /api/adrs/:id/ai/impact
 * AI-03: Impact Prediction
 * Predict which ADRs are impacted by changes to this ADR
 */
router.get('/:id/ai/impact', authenticate, (req, res) => {
  try {
    const result = predictImpact(parseInt(req.params.id));

    if (!result) {
      return res.status(404).json({ error: 'ADR not found' });
    }

    res.json({
      ...result,
      algorithm: 'Graph Traversal + Tag Overlap (Jaccard) + TF-IDF Cosine Similarity',
      weights: {
        direct_relationships: '50%',
        shared_tags: '25%',
        content_similarity: '25%',
      },
    });
  } catch (err) {
    console.error('AI Impact prediction error:', err);
    res.status(500).json({ error: 'Impact prediction failed' });
  }
});

module.exports = router;
