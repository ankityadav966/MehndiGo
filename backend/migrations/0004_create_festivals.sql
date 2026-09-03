CREATE TABLE IF NOT EXISTS festivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  tagline TEXT,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  banner_image TEXT NOT NULL,
  theme_color TEXT DEFAULT '#800020',
  badge_text TEXT DEFAULT 'FESTIVAL SPECIAL',
  priority INTEGER DEFAULT 50,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS festival_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  festival_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  coupon_code TEXT NOT NULL,
  discount_type TEXT DEFAULT 'PERCENTAGE',
  discount_value REAL NOT NULL,
  min_booking_amount REAL DEFAULT 0,
  max_discount REAL DEFAULT 1000,
  valid_from TEXT,
  valid_until TEXT,
  eligible_categories TEXT DEFAULT '["*"]',
  eligible_services TEXT DEFAULT '["*"]',
  terms_conditions TEXT,
  banner_image TEXT,
  priority INTEGER DEFAULT 50,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_festivals_active ON festivals(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_festivals_dates ON festivals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_festival_offers_festival ON festival_offers(festival_id, is_active);
CREATE INDEX IF NOT EXISTS idx_festival_offers_coupon ON festival_offers(coupon_code);
