const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', authenticate, (req, res) => {
  try {
    const db = getDb();

    // Total ADRs
    const totalAdrs = db.prepare('SELECT COUNT(*) as count FROM adrs').get();

    // ADRs by status
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM adrs GROUP BY status
    `).all();

    // Total users
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

    // Total comments
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get();

    // Total reviews
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM adr_reviews').get();

    // Recent ADRs (last 5)
    const recentAdrs = db.prepare(`
      SELECT a.id, a.adr_number, a.title, a.status, a.created_at, a.updated_at,
        u.username as author_name, u.full_name as author_full_name, u.avatar_color as author_color
      FROM adrs a
      JOIN users u ON a.author_id = u.id
      ORDER BY a.updated_at DESC
      LIMIT 5
    `).all();

    // Most active contributors
    const contributors = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_color, u.role,
        (SELECT COUNT(*) FROM adrs WHERE author_id = u.id) as adrs_created,
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comments_made,
        (SELECT COUNT(*) FROM adr_reviews WHERE reviewer_id = u.id) as reviews_given
      FROM users u
      ORDER BY adrs_created + comments_made + reviews_given DESC
      LIMIT 5
    `).all();

    // ADRs per month (for chart)
    const monthlyData = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM adrs
      GROUP BY month
      ORDER BY month
    `).all();

    // Tag usage
    const tagUsage = db.prepare(`
      SELECT t.name, t.color, COUNT(at.adr_id) as count
      FROM tags t
      LEFT JOIN adr_tags at ON t.id = at.tag_id
      GROUP BY t.id
      HAVING count > 0
      ORDER BY count DESC
    `).all();

    // Recent activity (comments and reviews) - separate queries to avoid UNION ORDER BY issues
    const recentComments = db.prepare(`
      SELECT 'comment' as type, c.content as description, c.created_at,
        u.username, u.full_name, u.avatar_color,
        a.adr_number, a.title as adr_title, a.id as adr_id
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN adrs a ON c.adr_id = a.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `).all();

    const recentReviews = db.prepare(`
      SELECT 'review' as type, r.decision || ': ' || COALESCE(r.comment, '') as description, r.created_at,
        u.username, u.full_name, u.avatar_color,
        a.adr_number, a.title as adr_title, a.id as adr_id
      FROM adr_reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN adrs a ON r.adr_id = a.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();

    const recentActivity = [...recentComments, ...recentReviews]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({
      stats: {
        total_adrs: totalAdrs.count,
        total_users: totalUsers.count,
        total_comments: totalComments.count,
        total_reviews: totalReviews.count,
        status_counts: statusCounts,
      },
      recent_adrs: recentAdrs,
      contributors,
      monthly_data: monthlyData,
      tag_usage: tagUsage,
      recent_activity: recentActivity,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
