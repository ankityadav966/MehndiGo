-- =========================================================================
-- MIGRATION 0008: REVIEWS, REVIEW MEDIA & COUPON SYSTEM PRODUCTION UPGRADE
-- =========================================================================

-- 1. Create coupon_usages table for tracking coupon redemptions & per-user limits
CREATE TABLE IF NOT EXISTS coupon_usages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_coupon ON coupon_usages(user_id, coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_booking ON coupon_usages(booking_id);

-- 2. Upgrade coupons table with production columns
ALTER TABLE coupons ADD COLUMN title TEXT;
ALTER TABLE coupons ADD COLUMN description TEXT;
ALTER TABLE coupons ADD COLUMN max_discount REAL DEFAULT 10000;
ALTER TABLE coupons ADD COLUMN usage_limit INTEGER DEFAULT 10000;
ALTER TABLE coupons ADD COLUMN per_user_limit INTEGER DEFAULT 1;
ALTER TABLE coupons ADD COLUMN used_count INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN auto_apply INTEGER DEFAULT 0;

-- 3. Upgrade bookings table with coupon attribution columns
ALTER TABLE bookings ADD COLUMN coupon_id INTEGER;
ALTER TABLE bookings ADD COLUMN coupon_code TEXT;
ALTER TABLE bookings ADD COLUMN discount_amount REAL DEFAULT 0.0;
ALTER TABLE bookings ADD COLUMN original_amount REAL DEFAULT 0.0;

-- 4. Delete fake/dummy/orphan reviews that have no valid completed booking
DELETE FROM reviews WHERE booking_id = 0 OR booking_id IS NULL;

-- 5. Ensure reviews unique constraint index on booking_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_unique ON reviews(booking_id);

-- 6. Recalculate true artist ratings and total reviews strictly from actual approved reviews
UPDATE artist_profiles
SET 
  total_reviews = (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE (reviews.artist_id = artist_profiles.id OR reviews.artist_id = artist_profiles.user_id OR CAST(reviews.artist_id AS TEXT) = CAST(artist_profiles.id AS TEXT) OR CAST(reviews.artist_id AS TEXT) = CAST(artist_profiles.user_id AS TEXT))
      AND (reviews.status = 'APPROVED' OR reviews.is_approved = 1)
  ),
  rating = COALESCE((
    SELECT ROUND(AVG(rating), 1)
    FROM reviews 
    WHERE (reviews.artist_id = artist_profiles.id OR reviews.artist_id = artist_profiles.user_id OR CAST(reviews.artist_id AS TEXT) = CAST(artist_profiles.id AS TEXT) OR CAST(reviews.artist_id AS TEXT) = CAST(artist_profiles.user_id AS TEXT))
      AND (reviews.status = 'APPROVED' OR reviews.is_approved = 1)
  ), 0.0);
