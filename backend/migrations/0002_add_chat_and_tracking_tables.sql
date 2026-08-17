-- Migration: 0002_add_chat_and_tracking_tables.sql
-- Description: Creates chat_messages and artist_locations tables in Cloudflare D1

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  latitude REAL,
  longitude REAL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artist_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER UNIQUE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
