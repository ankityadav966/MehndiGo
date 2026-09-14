# Design System: MehndiGo
> Tailored for: beauty salon service
> Aesthetic: Soft UI Evolution & Accessible Luxury (Artisan Henna & Beauty Marketplace)

## Core Color Palette
- **Primary (Royal Burgundy)**: `#9C1344` (Luxury, artisan heritage, consistent with wallet & brand identity)
- **Primary Light (Rose Mist)**: `#F8BBD0` / `#FFF0F5`
- **Accent (Heritage Gold)**: `#D4AF37` (Celebration, verified badges, rating stars)
- **Background (Light Mode)**: `#FFF8FA` (Warm alabaster with subtle rose undertone)
- **Surface / Cards**: `#FFFFFF` (Crisp white with soft `#9C134408` shadow)
- **Text Primary**: `#1D1D1D` (Charcoal black, WCAG AAA 11:1+ contrast)
- **Text Secondary**: `#705E58` (Warm taupe gray)
- **Border**: `#F1E3E7` (Subtle warm rose border)
- **Success**: `#16A34A` (Natural emerald)
- **Warning**: `#F59E0B` (Warm amber)
- **Error / Danger**: `#E11D48` (Rose red, gentle and clear)

## Typography (Poppins)
- **Headings**: Poppins SemiBold (600) / Bold (700)
- **Body**: Poppins Regular (400) / Medium (500)
- **Captions & Badges**: Poppins Medium (500), 11-12px

## Motion & Interaction Philosophy (Smooth & Subtle)
- **Timing**: 200ms - 280ms for micro-interactions
- **Physics**: Soft spring curves (`friction: 8, tension: 40`)
- **Feedback**: Immediate scale press state (`0.98`), tactile opacity (`0.85`), and haptic affirmation on success
- **Toasts**: Non-intrusive floating glassmorphic pills with gesture swipe-dismiss
- **Modals**: Smooth bottom sheets with drag-down handle and backdrop fade

## Anti-Patterns Avoided
- No harsh neon alerts or jarring primary red banners
- No unpadded bottom scroll areas beneath floating tab navigation
- No truncated or wrapped action button labels
- No unhandled single-action or rapid successive toast dismissals
