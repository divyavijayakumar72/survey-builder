CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  questions TEXT NOT NULL, -- JSON string
  createdAt TEXT NOT NULL,
  updatedAt TEXT,
  submitted INTEGER DEFAULT 0,
  submittedAt TEXT
); 