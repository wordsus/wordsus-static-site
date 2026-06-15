-- Migration: 0001_initial-schema
-- Creates the initial tables and indexes for Wordsus user data sync

CREATE TABLE IF NOT EXISTS users (
  id        TEXT NOT NULL PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reading_progress (
  id                 TEXT NOT NULL PRIMARY KEY,
  userId             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale             TEXT NOT NULL,
  bookSlug           TEXT NOT NULL,
  chapterSlug        TEXT NOT NULL,
  scrollContent      REAL NOT NULL DEFAULT 0,
  scrollLeftSidebar  REAL NOT NULL DEFAULT 0,
  scrollRightSidebar REAL NOT NULL DEFAULT 0,
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL,
  deletedAt          TEXT,
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX IF NOT EXISTS idx_reading_user_updated
  ON reading_progress(userId, updatedAt);

CREATE TABLE IF NOT EXISTS favorites (
  id        TEXT NOT NULL PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale    TEXT NOT NULL,
  bookSlug  TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_updated
  ON favorites(userId, updatedAt);

CREATE TABLE IF NOT EXISTS recent_books (
  id        TEXT NOT NULL PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale    TEXT NOT NULL,
  bookSlug  TEXT NOT NULL,
  "order"   INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX IF NOT EXISTS idx_recent_user_updated
  ON recent_books(userId, updatedAt);

CREATE INDEX IF NOT EXISTS idx_recent_user_order
  ON recent_books(userId, "order");

CREATE TABLE IF NOT EXISTS user_preferences (
  userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  value     TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (userId, key)
);

CREATE INDEX IF NOT EXISTS idx_preferences_user_updated
  ON user_preferences(userId, updatedAt);
