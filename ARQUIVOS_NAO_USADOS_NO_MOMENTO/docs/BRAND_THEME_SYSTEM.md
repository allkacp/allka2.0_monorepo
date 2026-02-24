# Brand Theme System Documentation

## Overview

The brand theme system centralizes the visual identity of the application through CSS variables. This ensures consistency across all surfaces (sidebar, headers, modals, etc.) without code duplication.

## How It Works

### 1. CSS Variables Setup
In `app/globals.css`, we define:
- `--brand-gradient`: The main brand gradient applied globally
- `--brand-background`: The full background configuration

### 2. Context Provider Integration
In `contexts/sidebar-context.tsx`, a useEffect monitors theme changes:
```typescript
useEffect(() => {
  const themeToApply = previewEnabled && previewTheme ? previewTheme : sidebarSettings
  const root = document.documentElement
  
  let gradientValue = "linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)"
  if (themeToApply.backgroundColor.startsWith("custom-gradient:")) {
    gradientValue = themeToApply.backgroundColor.replace("custom-gradient:", "")
  }
  
  root.style.setProperty("--brand-gradient", gradientValue)
  root.style.setProperty("--brand-background", themeToApply.backgroundColor)
}, [sidebarSettings, previewTheme, previewEnabled])
```

## Usage

### Using the `.brand-surface` Class
For any "premium" surface (headers, modals, containers), use:
```jsx
<div className="brand-surface">
  {/* Content here will have the brand gradient */}
</div>
```

### Using CSS Variables Directly
For custom styling that needs the gradient:
```css
.custom-element {
  background: var(--brand-gradient);
}

.custom-subtle {
  background: var(--brand-gradient);
  opacity: 0.1;
}
```

### Using in Tailwind Utilities
In Tailwind templates:
```jsx
<div className="bg-[var(--brand-gradient)]">
  Branded surface
</div>
```

## Current Implementation

### Updated Components
1. **Sidebar** (`components/sidebar.tsx`): Uses `brand-surface` class
2. **Company Header** (`components/company-view-slide-panel.tsx`): Uses `brand-surface` class
3. **Globals** (`app/globals.css`): Defines `.brand-surface` and `.brand-surface-subtle` utilities

## Theme Synchronization

When a user changes the sidebar theme:
1. The context provider updates CSS variables automatically
2. All components using `var(--brand-gradient)` reflect the change immediately
3. Preview mode tests changes without saving
4. Cancel reverts all changes instantly

## Adding to New Components

To make any component respect the brand theme:

**Before (hardcoded):**
```jsx
<header className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
```

**After (dynamic):**
```jsx
<header className="brand-surface text-white">
```

That's it! No prop drilling, no state management needed.

## Preview Behavior

During preview:
- The theme is applied to CSS variables
- All brand-surface elements update live
- When saved, the variables persist
- When cancelled, previous values restore

## Browser Support

CSS variables are supported in all modern browsers. The fallback gradient is defined in the CSS variables for older browsers.
