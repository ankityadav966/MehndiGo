-- Migration: 0003_add_reels_social_tables.sql
-- Description: Creates portfolio_likes, portfolio_comments tables, indexes, and adds views_count/caption columns in Cloudflare D1

-- 1. Create portfolio_likes table with user-portfolio uniqueness constraint
CREATE TABLE IF NOT EXISTS portfolio_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  portfolio_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, portfolio_id)
);

-- 2. Create portfolio_comments table
CREATE TABLE IF NOT EXISTS portfolio_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  portfolio_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create portfolio_saves table
CREATE TABLE IF NOT EXISTS portfolio_saves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  portfolio_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, portfolio_id)
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_portfolio ON portfolio_likes(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_user ON portfolio_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_portfolio ON portfolio_comments(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_comments_user ON portfolio_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_saves_portfolio ON portfolio_saves(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_saves_user ON portfolio_saves(user_id);
