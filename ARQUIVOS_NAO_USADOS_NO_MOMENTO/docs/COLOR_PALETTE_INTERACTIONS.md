# Interactive Color Palette Component - Interaction Design

## Overview
The color palette interface enables users to select, create, edit, and manage both predefined and custom color options for the application theme.

---

## Component Sections

### 1. Solid Colors Grid
**Current State:**
- Displays 8 columns of predefined solid color buttons
- Each button: 7x7 pixels, rounded corners, with border
- Selected color shows white indicator dot in center
- Hover state: scale up slightly (110%), lighter border

**User Interactions:**
- **Click a color button**: Immediately apply that color as the theme background
  - Visual feedback: white indicator dot appears/moves to clicked button
  - CSS variables update in real-time
  - Sidebar and all modal headers reflect the new color instantly
  - No confirmation needed

- **Hover any color button**: 
  - Button scales up to 110% for preview
  - Border becomes lighter/more visible
  - Cursor changes to pointer
  - Tooltip appears with color name (e.g., "Ocean Blue")

---

### 2. Custom Color Add Button
**Current State:**
- Located after the 8 predefined colors
- "+" icon button, dashed border, same size as color buttons
- Labeled "Custom color" in tooltip

**User Interactions:**
- **Click "+" button**:
  - RGB color picker modal/panel opens with smooth fade-in animation
  - Modal is centered on screen or attached to the right side (responsive)
  - Previously selected custom color (if any) pre-loads in the picker
  - Focus transfers to the RGB slider or input field
  - User can now define a custom color

---

### 3. RGB Color Picker (Modal/Panel)
**Structure:**
- Header: "Create Custom Color" or "Edit Custom Color"
- Close button (X) in top-right corner
- Three sliders or input fields:
  - **Red (0-255)**: Red slider with red gradient background
  - **Green (0-255)**: Green slider with green gradient background
  - **Blue (0-255)**: Blue slider with blue gradient background
- Live color preview box (large, shows the resulting color)
- RGB text display: "RGB(123, 45, 200)" below preview
- Hex code display: "#7B2DC8" below RGB
- Action buttons at bottom:
  - **Cancel** (secondary button, closes picker, no changes)
  - **Save** (primary button, adds/updates color)

**User Interactions:**

- **Adjust Red slider**:
  - Live preview updates in real-time as user drags
  - RGB values update instantly
  - Hex code updates instantly
  - No delay between slider movement and preview

- **Adjust Green slider**:
  - Same real-time preview behavior

- **Adjust Blue slider**:
  - Same real-time preview behavior

- **Click on RGB input field**:
  - Field becomes editable (highlighted)
  - User can type values (e.g., "255" for max red)
  - On blur or Enter, preview updates
  - Invalid values (>255 or <0) are either:
    - Clamped to 0-255 automatically
    - Or show error state and restore previous value

- **Click on Hex input field**:
  - Field becomes editable
  - User can paste or type hex codes (e.g., "#FF5733")
  - On blur or Enter, RGB sliders update to match
  - Invalid hex ignored or shows error

- **Preview box click**:
  - Optional: Opens native color picker (browser OS picker) for quick selection
  - Or, can be disabled for consistency

- **Cancel button**:
  - Modal closes with fade-out animation
  - Color picker resets to initial state
  - No color added or saved
  - Focus returns to the "+" button

- **Save button**:
  - Color is added to the solid colors grid as a new button
  - New color appears after predefined colors, before the "+" button
  - New button has a small delete icon (X or trash icon) overlay
  - RGB picker modal closes
  - New color is automatically selected (white indicator dot appears)
  - Theme updates immediately with new color applied
  - New color is persisted to localStorage

---

### 4. Custom Color Buttons
**Appearance:**
- Identical size and styling to predefined color buttons (7x7 pixels)
- Filled with the custom color
- White border by default
- Hover: scale 110%, border lightens
- On hover, a small **delete icon** appears (X or trash, semi-transparent)

**User Interactions:**

- **Click custom color button**:
  - Apply that color as the theme background (same as predefined colors)
  - White indicator dot appears
  - All elements update in real-time

- **Hover custom color button**:
  - Button scales to 110%
  - Border lightens
  - Small delete icon becomes fully visible (opacity 1)
  - Tooltip shows RGB values or Hex code

- **Click delete icon (X/trash)**:
  - Small confirmation dialog appears:
    - Text: "Delete this custom color?"
    - Two buttons: "Cancel" and "Delete"
  - If user clicks **Cancel**:
    - Dialog closes
    - Color remains in grid
  - If user clicks **Delete**:
    - Color is removed from grid
    - If this color was currently selected:
      - Revert to the first predefined color automatically
      - Update theme with first predefined color
    - Color is removed from localStorage
    - Grid reorganizes (no empty spaces)

- **Right-click on custom color** (optional):
  - Context menu appears with options:
    - "Edit Color" → Opens RGB picker with current color pre-loaded
    - "Delete Color" → Shows confirmation
  - Or provide an "Edit" option via a dedicated button/icon

---

### 5. Edit Custom Color (Optional Enhancement)
**User Interactions:**

- **Double-click a custom color button**:
  - Opens RGB picker modal with current color values pre-loaded in sliders
  - Header reads "Edit Custom Color"
  - Save button updates the existing color (not create new)
  - Delete button available for convenience

- **Or via right-click context menu**:
  - "Edit Color" option opens the picker as described above

---

## Responsive Behavior

### Desktop (1024px+)
- Grid displays 8 columns of colors
- RGB picker modal centered on screen
- Delete icon visible on hover

### Tablet (768px - 1023px)
- Grid displays 6-7 columns, adjust as needed
- RGB picker modal full-width with padding
- Touch-friendly: delete icon always visible on custom colors

### Mobile (< 768px)
- Grid displays 4-5 columns
- RGB picker modal full-screen or bottom sheet
- Delete button always visible on custom colors (no hover requirement)
- Sliders have larger touch targets
- Input fields have keyboard support

---

## State Management

### Persistence
- **Custom colors** persisted to localStorage under key: `"allka_custom_colors"`
- Format: JSON array of color objects
  ```
  [
    { hex: "#FF5733", rgb: { r: 255, g: 87, b: 51 }, name: "Custom Red" },
    { hex: "#7B2DC8", rgb: { r: 123, g: 45, b: 200 }, name: "Custom Purple" }
  ]
  ```
- On app load, custom colors restored from localStorage
- On app unload, custom colors saved automatically

### Current Selection
- Currently selected color stored in context
- Applied color reflected in:
  - Solid colors grid (white indicator dot)
  - Modal header (if custom color picker open)
  - Sidebar and all component headers (theme CSS variables)

### Modal State
- RGB picker modal visibility controlled by state
- Pre-loads current/selected color on open
- Clears on cancel/save

---

## Validation & Error Handling

### Invalid RGB Values
- Values outside 0-255 range clamped automatically
- User sees corrected value in field
- Preview updates to valid color

### Invalid Hex Input
- Non-hexadecimal characters ignored or prevented
- Leading "#" optional, added automatically
- Invalid hex shows error state (red border) for 2 seconds, then reverts

### Duplicate Colors
- Preventing exact duplicates is optional
- If attempted: show toast notification "Color already exists"
- Allow similar colors (slight RGB variations)

### Maximum Custom Colors
- Optional limit (e.g., max 10 custom colors)
- If limit reached, disable "+" button or show message
- Recommend: no hard limit for flexibility

---

## Accessibility

### Keyboard Navigation
- Tab through: predefined colors → "+" button → custom colors
- Enter/Space: activate/select color or open picker
- Escape: close RGB picker modal
- Delete key: delete focused custom color (with confirmation)

### Screen Reader Support
- Each color button has aria-label: "Select [Color Name] (RGB 255, 87, 51)"
- "+" button: "Add custom color"
- Delete button: "Delete [Color Hex]"
- RGB picker inputs labeled with aria-label
- Modal has role="dialog" with aria-labelledby

### Color Contrast
- All text readable on color preview backgrounds
- Delete icons have sufficient contrast or outlined style
- Selected indicator (white dot) visible on all predefined colors

---

## Animation & Transitions

### Smooth Interactions
- Color button hover: 100ms scale transition
- Modal open/close: 200ms fade-in/fade-out
- RGB slider update: 50ms value transition (preview box)
- Delete confirmation: 150ms scale-in animation

### No Jarring Changes
- Grid reorganization after delete: animated 200ms smooth reflow
- Theme color update: instant (CSS variable update)
- Button state changes: smooth opacity/scale transitions

---

## Error States & Edge Cases

1. **Storage quota exceeded**: Show toast "Unable to save color, storage full"
2. **Corrupted localStorage data**: Default to predefined colors only
3. **Very similar colors added**: Allowed, user can manage duplicates manually
4. **Delete last custom color**: Grid shrinks, "+" button remains visible
5. **Theme applied, then delete that color**: Theme reverts to first predefined color

---

## Future Enhancements

- Color naming: Allow user to name custom colors (e.g., "Brand Blue")
- Color history: Recently used colors section
- Import/Export: Share custom palettes
- Favorites: Mark colors as favorites for quick access
- Undo/Redo: Revert recent color changes
- Presets: Pre-built color palettes to apply all at once

