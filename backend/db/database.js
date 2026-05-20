const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'adr_system.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  // Handle triggers which contain semicolons inside BEGIN...END
  const statements = [];
  let current = '';
  let inTrigger = false;

  schema.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      return;
    }

    current += line + '\n';

    if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
      inTrigger = true;
    }

    if (inTrigger && trimmed.toUpperCase() === 'END;') {
      statements.push(current.trim());
      current = '';
      inTrigger = false;
    } else if (!inTrigger && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  });

  if (current.trim()) {
    statements.push(current.trim());
  }

  for (const stmt of statements) {
    if (stmt) {
      try {
        db.exec(stmt);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.error('Schema error:', err.message);
        }
      }
    }
  }

  console.log('Database schema initialized');
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, DB_PATH };
