/**
 * AI-02: Auto-Tagging
 * 
 * Analyzes ADR content and suggests relevant tags using a keyword-based
 * multi-label classifier with TF-IDF scoring.
 * 
 * Input:  ADR content (title + context + decision + consequences + alternatives)
 * Output: 2-5 tag suggestions with confidence scores
 */

const { tokenize, stem } = require('./tfidf');
const { getDb } = require('../db/database');

/**
 * Domain vocabulary mapping: keywords → tag names
 * Each tag has a list of strongly associated terms (stemmed)
 * Weight: how strongly each keyword indicates the tag
 */
const TAG_VOCABULARY = {
  architecture: {
    keywords: [
      'architect', 'microservic', 'monolith', 'pattern', 'design', 'structur',
      'decouple', 'modular', 'layer', 'tier', 'bounded', 'context', 'domain',
      'event-driven', 'event', 'driven', 'soa', 'servic', 'orient', 'decompos',
      'scalabl', 'distribut', 'component', 'mvc', 'cqrs', 'saga',
    ],
    description: 'System-level design and structure decisions',
  },
  frontend: {
    keywords: [
      'react', 'angular', 'vue', 'svelte', 'frontend', 'ui', 'ux', 'css',
      'javascript', 'typescript', 'component', 'render', 'dom', 'virtual',
      'browser', 'client', 'spa', 'ssr', 'state', 'hook', 'redux', 'responsive',
      'mobil', 'nextj', 'vit', 'webpack', 'tailwind', 'bootstrap',
    ],
    description: 'Frontend framework and UI decisions',
  },
  backend: {
    keywords: [
      'backend', 'server', 'api', 'rest', 'express', 'node', 'python', 'flask',
      'django', 'spring', 'java', 'endpoint', 'controller', 'middleware',
      'route', 'handler', 'request', 'response', 'http', 'logic', 'busi',
      'process', 'queue', 'worker', 'cron', 'job', 'microservic',
    ],
    description: 'Backend framework and server-side decisions',
  },
  database: {
    keywords: [
      'databas', 'sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'redis',
      'sqlite', 'schema', 'table', 'query', 'index', 'migration', 'orm',
      'relational', 'document', 'key-value', 'graph', 'cassandra', 'dynamo',
      'normal', 'denormal', 'shard', 'replica', 'backup', 'transact',
      'acid', 'jsonb', 'gin', 'fts', 'full-text', 'search', 'elastic',
    ],
    description: 'Database and data storage decisions',
  },
  security: {
    keywords: [
      'secur', 'auth', 'jwt', 'oauth', 'token', 'encrypt', 'hash', 'bcrypt',
      'password', 'rbac', 'role', 'permission', 'ssl', 'tls', 'https',
      'xss', 'csrf', 'injection', 'sanitiz', 'validat', 'firewall',
      'vulnerabil', 'audit', 'complianc', 'cert', 'cors', 'session',
    ],
    description: 'Security, authentication, and authorization decisions',
  },
  devops: {
    keywords: [
      'devop', 'docker', 'container', 'kubernet', 'k8s', 'ci', 'cd',
      'pipeline', 'deploy', 'jenkins', 'github', 'action', 'terraform',
      'ansible', 'helm', 'yaml', 'configur', 'automat', 'monitor',
      'log', 'alert', 'prometheus', 'grafana', 'infrastructur',
    ],
    description: 'DevOps, deployment, and infrastructure decisions',
  },
  performance: {
    keywords: [
      'perform', 'cache', 'redis', 'memcach', 'cdn', 'latenc', 'throughput',
      'optimiz', 'speed', 'fast', 'slow', 'bottleneck', 'load', 'balanc',
      'scal', 'benchmark', 'profil', 'metric', 'p99', 'p95', 'response',
      'time', 'batch', 'async', 'concurrent', 'parallel',
    ],
    description: 'Performance optimization decisions',
  },
  api: {
    keywords: [
      'api', 'rest', 'restful', 'graphql', 'grpc', 'websocket', 'endpoint',
      'swagger', 'openapi', 'json', 'xml', 'protobuf', 'payload', 'request',
      'response', 'version', 'pagination', 'rate', 'limit', 'throttl',
      'contract', 'schema', 'valid', 'seriali', 'deseriali',
    ],
    description: 'API design and communication protocol decisions',
  },
  infrastructure: {
    keywords: [
      'infrastruct', 'cloud', 'aws', 'azure', 'gcp', 'server', 'host',
      'vm', 'virtual', 'machin', 'network', 'dns', 'load', 'balanc',
      'cdn', 'storag', 's3', 'blob', 'region', 'availabil', 'zone',
      'cluster', 'node', 'scal', 'auto', 'elast',
    ],
    description: 'Cloud and infrastructure decisions',
  },
  testing: {
    keywords: [
      'test', 'unit', 'integrat', 'e2e', 'end-to-end', 'tdd', 'bdd',
      'jest', 'mocha', 'cypress', 'selenium', 'mock', 'stub', 'assert',
      'coverag', 'qa', 'quality', 'automat', 'regress', 'smoke',
      'load', 'stress', 'contract',
    ],
    description: 'Testing strategy and quality assurance decisions',
  },
};

/**
 * Suggest tags for ADR content
 * @param {string} text - Combined ADR text (title + all sections)
 * @param {number} maxTags - Maximum number of tags to suggest
 * @param {number} minConfidence - Minimum confidence threshold (0-100)
 * @returns {Array<{id, name, color, confidence, description, matchedKeywords}>}
 */
function suggestTags(text, maxTags = 5, minConfidence = 15) {
  const db = getDb();

  // Tokenize input text
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  // Count token frequencies
  const tokenFreq = new Map();
  for (const token of tokens) {
    tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
  }

  // Score each tag based on keyword matches
  const tagScores = [];

  for (const [tagName, tagData] of Object.entries(TAG_VOCABULARY)) {
    let score = 0;
    const matchedKeywords = [];
    const stemmedKeywords = tagData.keywords.map(k => stem(k.toLowerCase()));

    for (const keyword of stemmedKeywords) {
      // Check if keyword exists in the tokenized text
      for (const [token, freq] of tokenFreq) {
        // Exact match or prefix match (for stemmed words)
        if (token === keyword || token.startsWith(keyword) || keyword.startsWith(token)) {
          const matchScore = freq * (token === keyword ? 1.0 : 0.6);
          score += matchScore;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      }
    }

    if (score > 0) {
      // Normalize score: ratio of matched keywords to total possible keywords
      const maxPossibleScore = stemmedKeywords.length;
      const normalizedScore = Math.min(score / (maxPossibleScore * 0.15), 1.0);
      const confidence = Math.round(normalizedScore * 100);

      tagScores.push({
        tagName,
        confidence: Math.min(confidence, 99), // Cap at 99%
        matchedKeywords: matchedKeywords.slice(0, 5),
        description: tagData.description,
      });
    }
  }

  // Sort by confidence (highest first)
  tagScores.sort((a, b) => b.confidence - a.confidence);

  // Get actual tag IDs from database
  const dbTags = db.prepare('SELECT id, name, color FROM tags').all();
  const tagMap = new Map(dbTags.map(t => [t.name, t]));

  // Map results to database tags, filter by confidence
  const results = tagScores
    .filter(t => t.confidence >= minConfidence)
    .slice(0, maxTags)
    .map(t => {
      const dbTag = tagMap.get(t.tagName);
      return {
        id: dbTag?.id || null,
        name: t.tagName,
        color: dbTag?.color || '#6366f1',
        confidence: t.confidence,
        description: t.description,
        matchedKeywords: t.matchedKeywords,
      };
    })
    .filter(t => t.id !== null); // Only return tags that exist in DB

  return results;
}

module.exports = { suggestTags, TAG_VOCABULARY };
