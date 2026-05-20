-- =============================================
-- ADR System Database Schema
-- Architecture Decision Records
-- =============================================

-- Users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'developer' CHECK(role IN ('admin','architect','developer','viewer')),
  full_name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#6366f1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Architecture Decision Records
CREATE TABLE IF NOT EXISTS adrs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adr_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Proposed' CHECK(status IN ('Proposed','Accepted','Deprecated','Superseded')),
  context TEXT,
  decision TEXT,
  consequences TEXT,
  alternatives TEXT,
  author_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Version history for ADRs
CREATE TABLE IF NOT EXISTS adr_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adr_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  context TEXT,
  decision TEXT,
  consequences TEXT,
  alternatives TEXT,
  changed_by INTEGER NOT NULL,
  change_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adr_id) REFERENCES adrs(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Tags for categorization
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1'
);

-- Many-to-many: ADRs <-> Tags
CREATE TABLE IF NOT EXISTS adr_tags (
  adr_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (adr_id, tag_id),
  FOREIGN KEY (adr_id) REFERENCES adrs(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ADR relationships (supersedes, related-to, depends-on)
CREATE TABLE IF NOT EXISTS adr_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_adr_id INTEGER NOT NULL,
  target_adr_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('supersedes','related-to','depends-on')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_adr_id) REFERENCES adrs(id) ON DELETE CASCADE,
  FOREIGN KEY (target_adr_id) REFERENCES adrs(id) ON DELETE CASCADE
);

-- Comments / Discussion threads
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adr_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adr_id) REFERENCES adrs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Reviews / Approvals
CREATE TABLE IF NOT EXISTS adr_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adr_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','needs-changes')),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adr_id) REFERENCES adrs(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS adrs_fts USING fts5(
  title, context, decision, consequences, alternatives,
  content='adrs', content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS adrs_ai AFTER INSERT ON adrs BEGIN
  INSERT INTO adrs_fts(rowid, title, context, decision, consequences, alternatives)
  VALUES (new.id, new.title, new.context, new.decision, new.consequences, new.alternatives);
END;

CREATE TRIGGER IF NOT EXISTS adrs_ad AFTER DELETE ON adrs BEGIN
  INSERT INTO adrs_fts(adrs_fts, rowid, title, context, decision, consequences, alternatives)
  VALUES ('delete', old.id, old.title, old.context, old.decision, old.consequences, old.alternatives);
END;

CREATE TRIGGER IF NOT EXISTS adrs_au AFTER UPDATE ON adrs BEGIN
  INSERT INTO adrs_fts(adrs_fts, rowid, title, context, decision, consequences, alternatives)
  VALUES ('delete', old.id, old.title, old.context, old.decision, old.consequences, old.alternatives);
  INSERT INTO adrs_fts(rowid, title, context, decision, consequences, alternatives)
  VALUES (new.id, new.title, new.context, new.decision, new.consequences, new.alternatives);
END;
