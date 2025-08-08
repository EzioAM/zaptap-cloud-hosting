# ZapTap Logo Design Specification

## Brand Identity
**Name:** ZapTap
**Tagline:** Create automations in seconds

## Logo Concept
The ZapTap logo combines two core elements:
1. **Lightning Bolt** - Representing speed, power, and automation ("Zap")
2. **Tap Gesture/Ripple** - Representing interaction and simplicity ("Tap")

## Design Requirements

### Visual Elements
- **Primary Shape:** Geometric lightning bolt with clean, modern lines
- **Secondary Element:** Circular ripple effect emanating from the bolt's tip
- **Style:** Minimalist, flat design with optional gradient
- **Typography:** Clean, modern sans-serif font (suggested: Inter, Poppins, or custom)

### Color Specifications
- **Primary:**rgb(52, 0, 238) (Purple)
- **Secondary:** #FFD600 (Yellow)
- **Gradient Option:** Linear gradient from #6200ee to #FFD600
- **Monochrome:** Pure black (#000000) or white (#FFFFFF)

### Logo Variations

#### 1. App Icon (1024x1024)
- Full logo mark centered
- Background: White or gradient
- Safe area: 20% padding from edges
- Export formats: PNG, SVG

#### 2. Splash Screen Logo
- Centered logo with optional animation
- Size: 200x200px minimum
- Background: White (#FFFFFF)
- Optional: Subtle pulse or lightning animation

#### 3. Horizontal Logo
- Icon + "ZapTap" text
- Proportions: 1:3 (icon to text width ratio)
- Spacing: 0.5x icon width between icon and text
- Text alignment: Center-aligned with icon

#### 4. Icon-Only Variants
- 16x16px (favicon)
- 32x32px (small UI)
- 64x64px (medium UI)
- 128x128px (large UI)

### Technical Specifications

#### SVG Structure
```svg
<svg viewBox="0 0 100 100">
  <!-- Lightning bolt path -->
  <path class="lightning" d="..." />
  <!-- Tap ripple circles -->
  <circle class="ripple-1" cx="..." cy="..." r="..." />
  <circle class="ripple-2" cx="..." cy="..." r="..." />
</svg>
```

#### Grid System
- 100x100 unit grid
- Lightning bolt: 60x80 units
- Ripples: 20 unit radius increments
- Center point: 50,50

### Animation Guidelines
1. **Pulse Effect:** 0.5s ease-in-out, scale 1.0 to 1.1
2. **Lightning Strike:** 0.3s linear, opacity 0 to 1
3. **Ripple Expansion:** 1s ease-out, scale 0 to 1, opacity 1 to 0

### Usage Guidelines
- Minimum size: 16x16px
- Clear space: 0.5x logo height on all sides
- Don't rotate or skew the logo
- Don't change colors outside brand palette
- Maintain aspect ratio

### File Deliverables
```
branding/
├── logo.svg (master vector)
├── logo-icon.svg (icon only)
├── logo-horizontal.svg (with text)
├── logo-monochrome.svg
├── logo-animated.svg (with SMIL animation)
├── exports/
│   ├── app-icon-1024.png
│   ├── app-icon-512.png
│   ├── app-icon-256.png
│   ├── app-icon-128.png
│   ├── favicon-32.png
│   ├── favicon-16.png
│   └── splash-logo.png
└── android/
    ├── adaptive-icon-foreground.png
    └── adaptive-icon-background.png
```

## Implementation Notes
- Use vector graphics (SVG) for all source files
- Export PNGs at 2x resolution for retina displays
- Ensure logo works on both light and dark backgrounds
- Test visibility at all sizes before finalizing