-- Update festival banner images with distinct, high quality, authentic festival visuals
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=1200&q=85' WHERE id = 1 OR code = 'raksha_bandhan';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=1200&q=85' WHERE id = 2 OR code = 'janmashtami';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1631857455684-a54a2f03665f?auto=format&fit=crop&w=1200&q=85' WHERE id = 3 OR code = 'ganesh_chaturthi';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1601055283742-8b27e81b5553?auto=format&fit=crop&w=1200&q=85' WHERE id = 4 OR code = 'navratri';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85' WHERE id = 5 OR code = 'karwa_chauth';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=1200&q=85' WHERE id = 6 OR code = 'diwali';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85' WHERE id = 7 OR code = 'wedding_season';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=85' WHERE id = 8 OR code = 'new_year';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85' WHERE id = 9 OR code = 'makar_sankranti';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1200&q=85' WHERE id = 10 OR code = 'holi';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1601055903647-ddf1ee9701b7?auto=format&fit=crop&w=1200&q=85' WHERE id = 11 OR code = 'akshaya_tritiya';
UPDATE festivals SET banner_image = 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=85' WHERE id = 12 OR code = 'teej';

UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 1 OR coupon_code = 'RAKHI20';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 2 OR coupon_code = 'KANHA25';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1631857455684-a54a2f03665f?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 3 OR coupon_code = 'BAPPA20';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1601055283742-8b27e81b5553?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 4 OR coupon_code = 'GARBA25';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 5 OR coupon_code = 'KARWA500';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 6 OR coupon_code = 'DIWALI25';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 7 OR coupon_code = 'BRIDAL20';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 8 OR coupon_code = 'NEWYEAR20';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 9 OR coupon_code = 'SANKRANTI15';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 10 OR coupon_code = 'HOLI15';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1601055903647-ddf1ee9701b7?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 11 OR coupon_code = 'SHUBH20';
UPDATE festival_offers SET banner_image = 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=85' WHERE festival_id = 12 OR coupon_code = 'TEEJ25';
