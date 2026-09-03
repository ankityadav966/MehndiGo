-- 0007_cleanup_ratings_and_add_review_constraints.sql
-- Recalculate real ratings and review counts strictly from approved reviews in D1

-- 1. Reset all artist ratings and total_reviews to match exact approved reviews in reviews table
UPDATE artist_profiles
SET 
  total_reviews = (
    SELECT COUNT(*) 
    FROM reviews r 
    WHERE (r.artist_id = artist_profiles.user_id OR r.artist_id = artist_profiles.id)
      AND (r.status = 'APPROVED' OR r.is_approved = 1)
  ),
  rating = COALESCE(
    (
      SELECT ROUND(AVG(r.rating), 1)
      FROM reviews r 
      WHERE (r.artist_id = artist_profiles.user_id OR r.artist_id = artist_profiles.id)
        AND (r.status = 'APPROVED' OR r.is_approved = 1)
    ),
    0
  );

-- 2. Create unique index on reviews to enforce one review per booking per customer at database level if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_customer 
ON reviews(booking_id, customer_id);

-- 3. Create index for fast artist review lookups
CREATE INDEX IF NOT EXISTS idx_reviews_artist_status
ON reviews(artist_id, status, is_approved);
