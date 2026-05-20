/**
 * AI-03: Impact Prediction
 * 
 * When an ADR is proposed or its status changes, predicts which other ADRs
 * may be impacted and flags potential conflicts.
 * 
 * Uses three signals for prediction:
 * 1. Direct relationships (supersedes, depends-on, related-to) — highest weight
 * 2. Shared tags — indicates same domain area — medium weight
 * 3. Content similarity (TF-IDF cosine) — lowest weight but catches implicit connections
 * 
 * Input:  ADR ID
 * Output: Impact Report with affected ADRs and severity (High/Medium/Low)
 */

const { buildModel } = require('./tfidf');
const { getDb } = require('../db/database');

// Scoring weights for each signal
const WEIGHTS = {
  DIRECT_RELATION: 0.50,  // 50% weight for direct relationships
  SHARED_TAGS: 0.25,      // 25% weight for shared tags
  TEXT_SIMILARITY: 0.25,  // 25% weight for content similarity
};

// Relationship type impact multipliers
const RELATION_IMPACT = {
  'depends-on': 1.0,     // Dependent ADRs are most impacted
  'supersedes': 0.9,     // Superseded ADRs need attention
  'related-to': 0.6,     // Related ADRs may be affected
};

// Severity thresholds
const SEVERITY = {
  HIGH: 0.50,    // Score >= 50% → High Impact
  MEDIUM: 0.25,  // Score >= 25% → Medium Impact
  LOW: 0.10,     // Score >= 10% → Low Impact
};

/**
 * Generate an Impact Report for a given ADR
 * @param {number} adrId - The ADR being analyzed
 * @returns {{ adr: object, impacts: Array, summary: object }}
 */
function predictImpact(adrId) {
  const db = getDb();

  // Get the source ADR
  const sourceAdr = db.prepare(`
    SELECT a.*, u.full_name as author_name, u.avatar_color
    FROM adrs a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(adrId);

  if (!sourceAdr) return null;

  // Get all other ADRs
  const allAdrs = db.prepare(`
    SELECT a.*, u.full_name as author_name, u.avatar_color
    FROM adrs a JOIN users u ON a.author_id = u.id
    WHERE a.id != ?
  `).all(adrId);

  if (allAdrs.length === 0) return { adr: sourceAdr, impacts: [], summary: {} };

  // ======== Signal 1: Direct Relationships ========
  const relations = db.prepare(`
    SELECT r.*, 
      CASE WHEN r.source_adr_id = ? THEN r.target_adr_id ELSE r.source_adr_id END as related_id,
      r.relation_type
    FROM adr_relations r
    WHERE r.source_adr_id = ? OR r.target_adr_id = ?
  `).all(adrId, adrId, adrId);

  const relationScores = new Map();
  for (const rel of relations) {
    const impact = RELATION_IMPACT[rel.relation_type] || 0.5;
    const current = relationScores.get(rel.related_id) || 0;
    relationScores.set(rel.related_id, Math.max(current, impact));
  }

  // ======== Signal 2: Shared Tags ========
  const sourceTags = db.prepare(`
    SELECT tag_id FROM adr_tags WHERE adr_id = ?
  `).all(adrId).map(t => t.tag_id);

  const tagScores = new Map();
  if (sourceTags.length > 0) {
    for (const adr of allAdrs) {
      const adrTags = db.prepare(`
        SELECT tag_id FROM adr_tags WHERE adr_id = ?
      `).all(adr.id).map(t => t.tag_id);

      if (adrTags.length > 0) {
        const shared = sourceTags.filter(t => adrTags.includes(t)).length;
        const total = new Set([...sourceTags, ...adrTags]).size;
        const jaccard = shared / total; // Jaccard similarity
        if (jaccard > 0) {
          tagScores.set(adr.id, jaccard);
        }
      }
    }
  }

  // ======== Signal 3: Text Similarity ========
  const sourceText = [sourceAdr.title, sourceAdr.context, sourceAdr.decision, sourceAdr.consequences]
    .filter(Boolean).join(' ');

  const documents = allAdrs.map(adr => ({
    id: adr.id,
    text: [adr.title, adr.context, adr.decision, adr.consequences]
      .filter(Boolean).join(' '),
  }));

  const model = buildModel(documents);
  const similarResults = model.findSimilar(sourceText, allAdrs.length, 0.05);
  const textScores = new Map();
  for (const result of similarResults) {
    textScores.set(result.id, result.similarity);
  }

  // ======== Combine Signals ========
  const impactScores = new Map();

  for (const adr of allAdrs) {
    const relScore = relationScores.get(adr.id) || 0;
    const tagScore = tagScores.get(adr.id) || 0;
    const textScore = textScores.get(adr.id) || 0;

    const combinedScore =
      relScore * WEIGHTS.DIRECT_RELATION +
      tagScore * WEIGHTS.SHARED_TAGS +
      textScore * WEIGHTS.TEXT_SIMILARITY;

    if (combinedScore >= SEVERITY.LOW) {
      impactScores.set(adr.id, {
        score: combinedScore,
        relScore,
        tagScore,
        textScore,
      });
    }
  }

  // ======== Build Results ========
  // Get tags for display
  const getTagsStmt = db.prepare(`
    SELECT t.name, t.color FROM tags t
    JOIN adr_tags at ON t.id = at.tag_id
    WHERE at.adr_id = ?
  `);

  const impacts = allAdrs
    .filter(adr => impactScores.has(adr.id))
    .map(adr => {
      const scores = impactScores.get(adr.id);
      let severity = 'Low';
      if (scores.score >= SEVERITY.HIGH) severity = 'High';
      else if (scores.score >= SEVERITY.MEDIUM) severity = 'Medium';

      // Build explanation of why this ADR is impacted
      const reasons = [];
      if (scores.relScore > 0) {
        const rel = relations.find(r =>
          r.related_id === adr.id || r.source_adr_id === adr.id || r.target_adr_id === adr.id
        );
        reasons.push(`Direct relationship: ${rel?.relation_type || 'linked'}`);
      }
      if (scores.tagScore > 0) {
        reasons.push(`Shares ${Math.round(scores.tagScore * 100)}% of tags`);
      }
      if (scores.textScore > 0.1) {
        reasons.push(`${Math.round(scores.textScore * 100)}% content similarity`);
      }

      return {
        id: adr.id,
        adr_number: adr.adr_number,
        title: adr.title,
        status: adr.status,
        author_name: adr.author_name,
        avatar_color: adr.avatar_color,
        severity,
        score: Math.round(scores.score * 100),
        reasons,
        tags: getTagsStmt.all(adr.id),
        breakdown: {
          relationship: Math.round(scores.relScore * 100),
          sharedTags: Math.round(scores.tagScore * 100),
          contentSimilarity: Math.round(scores.textScore * 100),
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  // Generate summary
  const summary = {
    total_impacted: impacts.length,
    high: impacts.filter(i => i.severity === 'High').length,
    medium: impacts.filter(i => i.severity === 'Medium').length,
    low: impacts.filter(i => i.severity === 'Low').length,
    generated_at: new Date().toISOString(),
  };

  return {
    adr: {
      id: sourceAdr.id,
      adr_number: sourceAdr.adr_number,
      title: sourceAdr.title,
      status: sourceAdr.status,
    },
    impacts,
    summary,
  };
}

module.exports = { predictImpact };
