# UI/UX & Styling Guidelines

When performing UI/UX redesigns, layout improvements, or styling tasks, you must strictly adhere to the following rules:

1. **Preserve Existing Functionality (Strict Rule)**:
   - Do NOT remove, alter, or hide existing functionality, state, hooks, or API integrations.
   - Do NOT remove conditional badges, icons, or labels (e.g., Premium/Standard tier badges on portfolios) unless explicitly requested.
   - Do NOT change the text of existing action buttons. 
   - Ensure that purely visual changes do not break existing user flows or conditional rendering logic.

2. **Profile Display Rule**:
   - The stats labels `P:0, C:0, Can:0` must be **completely removed** from profile screens and never reintroduced.

3. **Artist Dashboard Layout & Palette Consistency**:
   - **Wallet Card Royal Burgundy Palette**:
     The wallet card on the Artist Dashboard must use Royal Burgundy (`#9C1344`) with matching burgundy shadow (`#9C1344`, opacity 0.25) to maintain visual continuity with `WalletScreen.js`. Never use generic pink (`Colors.primary`) for the wallet card.
   - **Card Sizing & Information Density**:
     All dashboard cards (Stats cards, booking summary cards, and wallet cards) must maintain compact dimensions (card container height ~110px, padding 12–16px, margins 10–16px) to allow artists to view critical booking metrics and actions without excessive vertical scrolling.

4. **Customer Home Screen Trending Reels Section**:
   - **Replaces "Trending & Popular"**: The Customer Home Screen must feature a dedicated "Trending Reels" section in place of the former "Trending & Popular" artist list.
   - **Card Specifications**:
     - Displays the 5–10 newest reels in a horizontal carousel.
     - Card dimensions: 130px × 205px (`borderRadius: 16`), with subtle shadow and elevation.
     - Video poster fallback: Automatically resolves `.mp4` to `.jpg` or image thumbnail.
     - Interactive badges: Play badge (`▶ Reel`) and Likes counter badge.
     - Navigation: Tapping any card navigates to `"Reels"` passing `{ reelId: item.id }`.

5. **Service Catalog Fullpage Image Preview**:
   - **Interactive Service Cover Images**:
     In `ArtistServiceCatalogScreen`, service cover images must always be clickable with a visible "Full Preview" affordance badge.
   - **Fullpage Modal Viewer**:
     - Fullscreen dark backdrop (`#000000`) with safe-area header (close button, service title, photo counter, share button).
     - Uncropped HD display (`resizeMode="contain"`) with horizontal paging.
     - Multi-image thumbnail strip at the bottom for quick jumping between photos.
     - Direct "Book Now" CTA inside the preview modal.
