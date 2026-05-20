/**
 * AI-01: Similarity Detection
 * 
 * When creating a new ADR, suggests existing ADRs that may address the same
 * concern, preventing duplicates. Uses TF-IDF + Cosine Similarity.
 * 
 * Input:  Full text of the new ADR (title + context + decision + consequences + alternatives)
 * Output: Ranked list of potentially related ADRs with confidence scores
 */

const { buildModel } = require('./tfidf');
const { getDb } = require('../db/database');

/**
 * Find ADRs similar to the given text
 * @param {string} text - Combined text of the new/draft ADR
 * @param {number|null} excludeId - ADR ID to exclude (for editing existing ADR)
 * @param {number} topK - Max number of results
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Array<{id, adr_number, title, status, similarity, confidence, matchedTerms}>}
 */
function findSimilarADRs(text, excludeId = null, topK = 5, threshold = 0.1) {
  const db = getDb();

  // Load all ADRs from database
  const adrs = db.prepare(`
    SELECT a.id, a.adr_number, a.title, a.status, a.context, a.decision, 
           a.consequences, a.alternatives, u.full_name as author_name, u.avatar_color
    FROM adrs a
    JOIN users u ON a.author_id = u.id
  `).all();

  if (adrs.length === 0) return [];

  // Build corpus: combine all text fields for each ADR
  const documents = adrs
    .filter(adr => adr.id !== excludeId)
    .map(adr => ({
      id: adr.id,
      text: [adr.title, adr.context, adr.decision, adr.consequences, adr.alternatives]
        .filter(Boolean)
        .join(' '),
      metadata: {
        adr_number: adr.adr_number,
        title: adr.title,
        status: adr.status,
        author_name: adr.author_name,
        avatar_color: adr.avatar_color,
      },
    }));

  // Build TF-IDF model
  const model = buildModel(documents);

  // Find similar documents
  const results = model.findSimilar(text, topK, threshold);

  // Extract matched keywords for explainability
  const queryKeywords = model.extractKeywords(text, 15);
  const queryTerms = new Set(queryKeywords.map(k => k.term));

  return results.map(r => {
    const docVector = model.documents.find(d => d.id === r.id);
    const matchedTerms = [];

    if (docVector) {
      for (const [term] of docVector.vector) {
        if (queryTerms.has(term)) {
          matchedTerms.push(term);
        }
      }
    }

    return {
      id: r.id,
      adr_number: r.metadata.adr_number,
      title: r.metadata.title,
      status: r.metadata.status,
      author_name: r.metadata.author_name,
      avatar_color: r.metadata.avatar_color,
      similarity: r.similarity,
      confidence: Math.round(r.similarity * 100),
      matchedTerms: matchedTerms.slice(0, 8),
    };
  });
}

module.exports = { findSimilarADRs };
