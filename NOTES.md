# Project Notes

## Color Scheme

### Core Gradient Colors
Use these for backgrounds, hero sections, and major UI elements.

| Color | Usage | Hex |
|-------|-------|-----|
| Midnight Indigo | Primary text / depth contrast | `#0A2540` |
| Electric Purple | Gradient top | `#7B61FF` |
| Magenta Red | Middle gradient & CTA buttons | `#FF3C7E` |
| Sunset Orange | Gradient blend / accents | `#FF6A3D` |
| Sky Blue | Lighter gradient areas | `#7CDFFF` |
| Lavender Pink | Soft gradient edges | `#F6AFFF` |

### Accent & UI Colors
Use for buttons, hover states, icons, etc.

| Color | Usage | Hex |
|-------|-------|-----|
| Deep Navy | Button fill / dark UI | `#1E1F25` |
| Bright White | Card / form backgrounds | `#FFFFFF` |
| Cool Gray | Border / muted text | `#CBD5E1` |
| Success Green | Positive indicators | `#22C55E` |
| Warning Orange | Warnings or highlights | `#F97316` |

## UI/UX Guidelines

### Color Application Guide

#### 1. Primary Layout & Backgrounds
- **Bright White** `#FFFFFF`
  - Main background for cards, forms, content sections
  - Keeps interface clean and readable

- **Deep Navy** `#1E1F25`
  - Sidebars, top navbars, modal overlays
  - Provides contrast and anchors the layout

#### 2. Text & Typography
- **Midnight Indigo** `#0A2540`
  - Primary text, headings, important labels
  - Clean and readable on light backgrounds

- **Cool Gray** `#CBD5E1`
  - Muted text, helper text, timestamps
  - Less emphasized data

#### 3. Brand Gradient & Visual Appeal
Create smooth gradients using:
- Top: **Electric Purple** `#7B61FF`
- Middle: **Magenta Red** `#FF3C7E`
- Bottom: **Sunset Orange** `#FF6A3D` fading into **Sky Blue** `#7CDFFF`
- Edge softness: **Lavender Pink** `#F6AFFF`

**Usage**:
- Dashboard welcome banners
- Event promo cards
- Section headers
- Featured stats blocks

#### 4. Buttons & CTAs
- **Primary CTA**: Magenta Red `#FF3C7E`
- **Secondary/Hover**: Sunset Orange `#FF6A3D` or Electric Purple `#7B61FF`
- **Disabled/Secondary UI**: Cool Gray `#CBD5E1`

#### 5. Icons, Tags & Status Indicators
- **Success**: Green `#22C55E` (Active/Confirmed states)
- **Warning**: Orange `#F97316` (Pending/Issues)
- **Info/Neutral**: Sky Blue `#7CDFFF` (Tooltips/Info badges)

#### 6. Cards & Visual Blocks
- **Key Metrics**: Electric Purple to Magenta Red gradient
- **Standard Data**: White cards with indigo/gray text
- **Hover/Selected States**: 
  - Soft Lavender Pink glow
  - Sky Blue underline

### UI Component Color Guide

| Component | Suggested Colors |
|-----------|------------------|
| Navbar | Deep Navy + Cool Gray icons |
| Sidebar | Deep Navy + Electric Purple highlights |
| CTA Button | Magenta Red with white text |
| Highlight Card | Electric Purple → Magenta Red gradient |
| Tooltip/Info Box | Sky Blue background + Indigo text |
| Table Headers | Midnight Indigo on White |
| Warning Tag | Warning Orange with white text |
| Success Badge | Success Green with white text |

## Quick Notes
- [ ] Add your quick notes here
- [ ] Use checkboxes for tasks
- [ ] Keep track of important information

## Development Log

### 2025-08-02
- Fixed TypeScript errors in MetricsGrid and Dashboard components
- Updated Supabase client implementation
- Replaced dummy trend data with dynamic calculations in MetricsGrid

## Ideas & Improvements
- [ ] Add more detailed metrics
- [ ] Implement real-time updates for dashboard
- [ ] Add user authentication flows

## Resources
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://reactjs.org/)
- [TypeScript Docs](https://www.typescriptlang.org/)
