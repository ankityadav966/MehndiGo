# Media Carousel & Gallery Standards

## 1. Safe Image Attribute Parsing
- Always parse image fields (`service_image`, `portfolio_images`) using a robust parser that handles:
  - Native arrays: `["url1", "url2"]`
  - Stringified JSON arrays: `'["url1", "url2"]'`
  - Single image URLs or fallback placeholders

## 2. Interactive Swiping Carousel Requirements
- When displaying multi-image service items or catalog options:
  - **Mobile (React Native):** Use horizontal `ScrollView` with `pagingEnabled`, page dots indicators (`● ○ ○`), left/right navigation arrows, photo counter badge (`📷 X / Y`), and fullscreen modal preview on tap.
  - **Web (React):** Use horizontal scroll container with `scrollSnapType: "x mandatory"`, thumbnail galleries, and image preview support.
- NEVER truncate multi-image attributes to `images[0]` without providing carousel swiping functionality.
