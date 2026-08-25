-- Migration 0009: Update Categories & Festivals with Authoritative Mehndi Data & Genuine Creatives

-- 1. Ensure all 10 standard Mehndi Categories exist with correct slugs, names, and active status
INSERT OR REPLACE INTO categories (id, name, slug, description, image_url, is_active) VALUES
(1, 'Bridal Mehndi', 'bridal-mehndi', 'Full arm and leg luxury traditional bridal henna designs with dulha-dulhan motifs.', 'asset://categories/bridal.png', 1),
(2, 'Arabic Mehndi', 'arabic-mehndi', 'Bold flowing floral vines, shaded mandalas, and elegant negative space designs.', 'asset://categories/arabic.png', 1),
(3, 'Rajasthani & Marwari', 'rajasthani-marwari', 'Authentic Marwari, peacock, kalash, and doli heritage royal wedding patterns.', 'asset://categories/rajasthani.png', 1),
(4, 'Indo-Western Fusion', 'indo-western', 'Modern contemporary lace patterns, cuff bracelets, and chic symmetrical motifs.', 'asset://categories/indo_western.png', 1),
(5, 'Floral & Mandala', 'floral-mandala', 'Delicate blossoms, symmetrical centerpieces, and concentric circular mandalas.', 'asset://categories/floral.png', 1),
(6, 'Traditional Indian', 'traditional-indian', 'Classic paisley, mango ambi, and festive henna for all cultural celebrations.', 'asset://categories/traditional.png', 1),
(7, 'Pakistani & Khafif', 'pakistani-khafif', 'Exquisite fine-line lace, airy geometric jaal, and shaded Khafif artistry.', 'asset://categories/pakistani.png', 1),
(8, 'Minimalist & Geometric', 'minimalist-geometric', 'Chic finger accents, delicate wrist bands, tiny lotus dots, and modern accents.', 'asset://categories/minimalist.png', 1),
(9, 'Engagement & Sangeet', 'engagement-sangeet', 'Celebration patterns tailored for engagement ceremonies, sangeet, and bridesmaids.', 'asset://categories/engagement.png', 1),
(10, 'Royal Portrait Mehndi', 'royal-portrait', 'Hand-drawn miniature bride and groom portraits with ornate jharokha borders.', 'asset://categories/royal.png', 1);

-- 2. Update festival_offers and festivals with clean, authentic festival banner references
UPDATE festivals SET banner_image = 'asset://festivals/raksha_bandhan.png' WHERE id = 1 OR code = 'raksha_bandhan';
UPDATE festivals SET banner_image = 'asset://festivals/janmashtami.png' WHERE id = 2 OR code = 'janmashtami';
UPDATE festivals SET banner_image = 'asset://festivals/ganesh_chaturthi.png' WHERE id = 3 OR code = 'ganesh_chaturthi';
UPDATE festivals SET banner_image = 'asset://festivals/navratri.png' WHERE id = 4 OR code = 'navratri';
UPDATE festivals SET banner_image = 'asset://festivals/karwa_chauth.png' WHERE id = 5 OR code = 'karwa_chauth';
UPDATE festivals SET banner_image = 'asset://festivals/diwali.png' WHERE id = 6 OR code = 'diwali';
UPDATE festivals SET banner_image = 'asset://categories/bridal.png' WHERE id = 7 OR code = 'wedding_season';
UPDATE festivals SET banner_image = 'asset://festivals/diwali.png' WHERE id = 8 OR code = 'new_year';
UPDATE festivals SET banner_image = 'asset://festivals/raksha_bandhan.png' WHERE id = 9 OR code = 'makar_sankranti';
UPDATE festivals SET banner_image = 'asset://festivals/navratri.png' WHERE id = 10 OR code = 'holi';
UPDATE festivals SET banner_image = 'asset://festivals/diwali.png' WHERE id = 11 OR code = 'akshaya_tritiya';
UPDATE festivals SET banner_image = 'asset://categories/bridal.png' WHERE id = 12 OR code = 'teej';

UPDATE festival_offers SET banner_image = 'asset://festivals/raksha_bandhan.png' WHERE festival_id = 1 OR coupon_code = 'RAKHI20';
UPDATE festival_offers SET banner_image = 'asset://festivals/janmashtami.png' WHERE festival_id = 2 OR coupon_code = 'KANHA25';
UPDATE festival_offers SET banner_image = 'asset://festivals/ganesh_chaturthi.png' WHERE festival_id = 3 OR coupon_code = 'BAPPA20';
UPDATE festival_offers SET banner_image = 'asset://festivals/navratri.png' WHERE festival_id = 4 OR coupon_code = 'GARBA25';
UPDATE festival_offers SET banner_image = 'asset://festivals/karwa_chauth.png' WHERE festival_id = 5 OR coupon_code = 'KARWA500';
UPDATE festival_offers SET banner_image = 'asset://festivals/diwali.png' WHERE festival_id = 6 OR coupon_code = 'DIWALI25';
UPDATE festival_offers SET banner_image = 'asset://categories/bridal.png' WHERE festival_id = 7 OR coupon_code = 'BRIDAL20';
UPDATE festival_offers SET banner_image = 'asset://festivals/diwali.png' WHERE festival_id = 8 OR coupon_code = 'NEWYEAR20';
UPDATE festival_offers SET banner_image = 'asset://festivals/raksha_bandhan.png' WHERE festival_id = 9 OR coupon_code = 'SANKRANTI15';
UPDATE festival_offers SET banner_image = 'asset://festivals/navratri.png' WHERE festival_id = 10 OR coupon_code = 'HOLI15';
UPDATE festival_offers SET banner_image = 'asset://festivals/diwali.png' WHERE festival_id = 11 OR coupon_code = 'SHUBH20';
UPDATE festival_offers SET banner_image = 'asset://categories/bridal.png' WHERE festival_id = 12 OR coupon_code = 'TEEJ25';
