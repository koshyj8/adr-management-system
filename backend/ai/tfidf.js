/**
 * TF-IDF (Term Frequency - Inverse Document Frequency) Engine
 * 
 * Pure JavaScript implementation for text similarity computation.
 * Used by: Similarity Detection, Auto-Tagging, Impact Prediction
 * 
 * How it works:
 * 1. Tokenize text → split into words, lowercase, remove stopwords, stem
 * 2. Compute TF (Term Frequency) → how often a word appears in a document
 * 3. Compute IDF (Inverse Document Frequency) → how rare a word is across all documents
 * 4. TF-IDF weight = TF × IDF → high for important, distinctive terms
 * 5. Cosine Similarity → angle between two TF-IDF vectors (0 = unrelated, 1 = identical)
 */

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he',
  'she', 'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your',
  'his', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'because', 'as', 'until', 'while', 'about',
  'between', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'also', 'if', 'into', 'any', 'e', 'g', 'etc',
  'however', 'using', 'used', 'use', 'uses', 'will', 'well', 'within',
]);

/**
 * Simple word stemmer - reduces words to approximate root form
 * Not as sophisticated as Porter Stemmer, but sufficient for our needs
 */
function stem(word) {
  if (word.length < 4) return word;

  // Remove common suffixes
  const suffixes = [
    'ation', 'ment', 'ness', 'ible', 'able', 'tion', 'sion',
    'ence', 'ance', 'ment', 'ious', 'eous', 'ful', 'less',
    'ling', 'ally', 'ised', 'ized', 'ise', 'ize', 'ity',
    'ing', 'ies', 'ous', 'ive', 'ers', 'est', 'ent',
    'ant', 'ate', 'ion', 'ify',
    'ed', 'er', 'es', 'al', 'ly',
    's',
  ];

  for (const suffix of suffixes) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

/**
 * Tokenize text into normalized, stemmed terms
 * @param {string} text - Raw text to tokenize
 * @returns {string[]} Array of stemmed tokens
 */
function tokenize(text) {
  if (!text) return [];

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')  // Remove special chars except hyphens
    .replace(/[-]+/g, ' ')           // Replace hyphens with spaces
    .split(/\s+/)                    // Split on whitespace
    .filter(word => word.length > 1 && !STOPWORDS.has(word))  // Remove stopwords
    .map(stem);                      // Stem words
}

/**
 * Compute Term Frequency (TF) for a document
 * TF(t, d) = count of t in d / total terms in d
 * @param {string[]} tokens - Tokenized document
 * @returns {Map<string, number>} Term frequency map
 */
function computeTF(tokens) {
  const tf = new Map();
  const total = tokens.length;

  if (total === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Normalize by document length
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }

  return tf;
}

/**
 * Compute Inverse Document Frequency (IDF) across a corpus
 * IDF(t) = log(N / df(t)) where N = total docs, df(t) = docs containing t
 * @param {Map<string, number>[]} tfMaps - Array of TF maps (one per document)
 * @returns {Map<string, number>} IDF map
 */
function computeIDF(tfMaps) {
  const N = tfMaps.length;
  if (N === 0) return new Map();

  const df = new Map(); // Document frequency

  for (const tf of tfMaps) {
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const idf = new Map();
  for (const [term, freq] of df) {
    // Smoothed IDF to avoid division by zero and log(1) = 0
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }

  return idf;
}

/**
 * Compute TF-IDF vector for a document
 * @param {Map<string, number>} tf - Term frequency map
 * @param {Map<string, number>} idf - Inverse document frequency map
 * @returns {Map<string, number>} TF-IDF weighted vector
 */
function computeTFIDF(tf, idf) {
  const tfidf = new Map();

  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || 1;
    tfidf.set(term, tfVal * idfVal);
  }

  return tfidf;
}

/**
 * Compute cosine similarity between two TF-IDF vectors
 * cos(A, B) = (A · B) / (|A| × |B|)
 * Returns 0 (completely different) to 1 (identical)
 * 
 * @param {Map<string, number>} vecA - First TF-IDF vector
 * @param {Map<string, number>} vecB - Second TF-IDF vector
 * @returns {number} Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  // Compute dot product (only over shared terms)
  for (const [term, weightA] of vecA) {
    const weightB = vecB.get(term) || 0;
    dotProduct += weightA * weightB;
    magnitudeA += weightA * weightA;
  }

  for (const [, weightB] of vecB) {
    magnitudeB += weightB * weightB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Build a TF-IDF model from a corpus of documents
 * @param {Array<{id: any, text: string}>} documents - Corpus of documents
 * @returns {{ documents: Array, idf: Map, getVector: Function, getSimilarity: Function }}
 */
function buildModel(documents) {
  // Tokenize all documents
  const tokenized = documents.map(doc => ({
    id: doc.id,
    tokens: tokenize(doc.text),
    metadata: doc.metadata || {},
  }));

  // Compute TF for each document
  const tfMaps = tokenized.map(doc => computeTF(doc.tokens));

  // Compute IDF across corpus
  const idf = computeIDF(tfMaps);

  // Compute TF-IDF vectors
  const vectors = tokenized.map((doc, i) => ({
    id: doc.id,
    vector: computeTFIDF(tfMaps[i], idf),
    metadata: doc.metadata,
  }));

  return {
    documents: vectors,
    idf,

    /**
     * Get TF-IDF vector for new text (using existing IDF)
     */
    getVector(text) {
      const tokens = tokenize(text);
      const tf = computeTF(tokens);
      return computeTFIDF(tf, idf);
    },

    /**
     * Find most similar documents to given text
     * @param {string} text - Query text
     * @param {number} topK - Number of results
     * @param {number} threshold - Minimum similarity (0 to 1)
     * @returns {Array<{id: any, similarity: number, metadata: any}>}
     */
    findSimilar(text, topK = 5, threshold = 0.1) {
      const queryVector = this.getVector(text);

      const results = vectors
        .map(doc => ({
          id: doc.id,
          similarity: cosineSimilarity(queryVector, doc.vector),
          metadata: doc.metadata,
        }))
        .filter(r => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return results;
    },

    /**
     * Compute similarity between two specific documents
     */
    computeSimilarityBetween(docId1, docId2) {
      const doc1 = vectors.find(v => v.id === docId1);
      const doc2 = vectors.find(v => v.id === docId2);
      if (!doc1 || !doc2) return 0;
      return cosineSimilarity(doc1.vector, doc2.vector);
    },

    /**
     * Get top keywords from text (highest TF-IDF weights)
     */
    extractKeywords(text, topK = 10) {
      const vector = this.getVector(text);
      return Array.from(vector.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK)
        .map(([term, weight]) => ({ term, weight }));
    },
  };
}

module.exports = { tokenize, computeTF, computeIDF, computeTFIDF, cosineSimilarity, buildModel, stem };
