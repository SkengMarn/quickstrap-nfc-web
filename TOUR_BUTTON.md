# 🧭 Tour Button - Quick Guide

## Overview

A **blinking "Take Tour" button** appears in the bottom-right corner of the portal when you're logged in.

---

## Location

**Bottom-right corner** of the screen - always visible and accessible.

---

## Visual Design

### Button Features:
- **Gradient background** - Blue to purple
- **Pulsing rings** - Animated rings to draw attention
- **Spinning compass icon** - Rotates slowly
- **"Take Tour" text** - Clear call-to-action
- **Hover tooltip** - Shows "Learn how to use the portal"
- **Hover effect** - Button scales up slightly on hover

### Animations:
- **Ping animation** - Outer ring pulses outward
- **Pulse animation** - Inner ring fades in/out
- **Spin animation** - Compass icon rotates every 3 seconds
- **Scale on hover** - Button grows 5% when you hover over it

---

## How to Use

### Start the Tour:
1. Look for the blinking button in the **bottom-right corner**
2. Click the **"Take Tour"** button
3. Interactive tour starts immediately
4. Follow the highlighted elements through the portal

### During the Tour:
- **Next** - Click to go to the next step
- **Skip Tour** - Click to exit anytime
- **X button** - Close the tour
- Progress bar shows your current step

### After Completion:
- Button reappears in the corner
- Click anytime to retake the tour
- Completion is saved to localStorage

---

## When Does It Appear?

✅ **Shows:**
- When logged in
- When tour is NOT active
- On all pages (persistent)

❌ **Hides:**
- When tour is active
- When logged out
- During the tour itself

---

## Technical Details

### Component Location:
- **File:** `src/components/onboarding/TourButton.tsx`
- **Used in:** `src/App.tsx`

### State Management:
```typescript
const [showTour, setShowTour] = useState(false);

// Show tour when button clicked
<TourButton onClick={() => setShowTour(true)} />

// Hide button when tour is active
{session && !showTour && <TourButton />}
```

### Styling:
- **Fixed position** - `bottom-6 right-6`
- **Z-index** - `9997` (below tour overlay but above all content)
- **Tailwind animations** - `animate-ping`, `animate-pulse`, `animate-spin-slow`

### Custom Animation:
Added to `tailwind.config.js`:
```javascript
animation: {
  'spin-slow': 'spin 3s linear infinite',
}
```

---

## Accessibility

- **aria-label** - "Take Tour" for screen readers
- **Keyboard accessible** - Can be triggered via keyboard
- **Clear visual feedback** - Hover states and animations
- **High contrast** - Blue/purple gradient stands out

---

## Alternative Access

You can also start the tour from:
- **Settings → Help & Onboarding → "Start Onboarding Wizard"**

---

## Design Rationale

### Why Bottom-Right?
- Non-intrusive location
- Doesn't block main content
- Common pattern for help/support buttons
- Easy to spot but not annoying

### Why Blinking/Pulsing?
- Draws attention without being aggressive
- Indicates interactive element
- Subtle enough not to distract
- Helps new users discover the tour

### Why Always Visible?
- Users can retake the tour anytime
- Helpful for new features/updates
- Reduces support requests
- Improves onboarding experience

---

## Future Enhancements

Potential improvements:
- [ ] Show hint text "New here? Take a tour!" first time only
- [ ] Add badge showing number of new features since last tour
- [ ] Customize button position (user preference)
- [ ] Track tour completion analytics
- [ ] Show different tours for different user roles

---

**Status:** ✅ Complete and deployed
**Build:** Successful (3.17s)
**Dev Server:** Running at http://localhost:3000/
