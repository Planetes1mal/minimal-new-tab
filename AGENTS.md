# AGENTS.md

This document provides guidelines and instructions for agentic coding agents working on this codebase.

## Project Overview

This is a Chrome/Edge Extension (Manifest V3) that provides a minimalist new tab page with:
- Time and date display
- Search functionality with engine switching (Google/Bing)
- Quick links management with drag-and-drop reordering
- Theme system (light/dark/system-following)

**Tech Stack**: Pure HTML5 + CSS3 + Vanilla JavaScript (no build tools)

---

## Build, Test & Deployment

### Installation (Developer Mode)

1. Open Chrome/Edge extensions page: `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root directory

### No Build Commands

This is a pure vanilla JS/CSS project with **no build process**:
- No npm/package.json
- No bundler (webpack, vite, etc.)
- No test runner
- No linter

To verify changes:
1. Reload the extension on `chrome://extensions/`
2. Open a new tab to see changes

---

## Code Style Guidelines

### General Principles

- **Simplicity First**: This is a lightweight extension. Avoid adding heavy dependencies.
- **No Build Tools**: Keep code in plain HTML, CSS, and JS. No TypeScript, no bundlers.
- **Performance**: Minimize file size and execution time.
- **Compatibility**: Target Chrome 88+ and Edge 88+ (Manifest V3).

### HTML

- Use semantic HTML5 elements
- Include `lang` attribute on `<html>`: `<html lang="zh-CN">`
- Include accessibility attributes (`aria-label`, `alt`, etc.)
- External resources: use `<link rel="preconnect">` for fonts
- Inline SVGs preferred for icons (no external icon files)

### CSS

**File**: `styles.css`

#### Variables (CSS Custom Properties)
- Prefix all color variables with `--c-` (e.g., `--c-bg`, `--c-text-primary`)
- Group variables by theme mode (light/dark/system)
- Use CSS variables instead of hardcoded colors

```css
:root {
    --c-bg: #ffffff;
    --c-text-primary: #1a1a1a;
    --c-accent: #007aff;
}
```

#### Naming Conventions
- Use **kebab-case** for class names: `.quick-link`, `.theme-toggle`
- BEM-lite naming for complex components: `.segment-option`, `.segment-label`
- ID selectors for JavaScript hooks: `#search-input`, `#theme-toggle`

#### Layout & Styling
- Use CSS variables for all colors
- Use `flexbox` for layouts
- Use `rem` for font sizes, `px` for borders/shadows
- Prefer `border-radius: 12px` to `border-radius: 50%` for modern look
- Use `backdrop-filter: blur()` for glassmorphism effects
- Use `cubic-bezier(0.25, 1, 0.5, 1)` for smooth transitions

#### Theme System
- Support three modes: `light`, `dark`, and `null` (follow system)
- Define base variables in `:root`
- Override with `@media (prefers-color-scheme: dark)` for system themes
- Use `.light` / `.dark` classes on `<body>` for manual overrides
- Set styles in JavaScript via `element.style.setProperty()` for dynamic themes

### JavaScript

**File**: `script.js`

#### Structure
- Use **object literal pattern** for module-like organization
- Use **IIFE pattern** if module isolation is needed
- Keep all code in a single file for simplicity

```javascript
const themeManager = {
    currentTheme: null,
    init() { /* ... */ },
    loadTheme() { /* ... */ },
    // ...
};

const storage = {
    get(key, callback) { /* ... */ },
    set(items, callback) { /* ... */ }
};
```

#### Naming Conventions
- **CamelCase** for object names: `themeManager`, `storage`
- **camelCase** for methods: `loadTheme()`, `saveLinks()`
- **lowercase** for variables: `currentEngineIndex`, `defaultLinks`
- **UPPERCASE** for constants: `ENGINE_ICONS`
- Use Chinese comments for business logic (matches existing codebase)

#### Variables
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Initialize variables at declaration when possible

#### Functions
- Keep functions focused and small (< 50 lines preferred)
- Use meaningful names: `updateEngineIcon()` not `updateIcon()`
- Group related functions together

#### Storage API
- Use `chrome.storage.sync` for persistent storage
- Provide localStorage fallback for development:
```javascript
const storage = {
    get: function(key, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.get(key, callback);
        } else {
            // localStorage fallback
        }
    },
    set: function(items, callback) {
        // similar pattern
    }
};
```

#### Error Handling
- Wrap storage operations in try-catch blocks
- Log errors with `console.error()`
- Provide graceful fallbacks

```javascript
try {
    const savedTheme = localStorage.getItem('theme');
    this.currentTheme = savedTheme || null;
} catch (e) {
    console.error('Error loading theme:', e);
    this.currentTheme = null;
}
```

#### DOM Manipulation
- Cache DOM elements: `const themeToggle = document.getElementById('theme-toggle');`
- Check element existence before manipulation:
```javascript
if (themeToggle) {
    themeToggle.addEventListener('click', () => { /* ... */ });
}
```
- Use `classList` for class toggling: `element.classList.add('dark')`

#### Event Handling
- Use `addEventListener` over inline handlers
- Use event delegation where appropriate
- Prevent default behavior explicitly

---

## File Structure

```
minimal-new-tab/
├── manifest.json       # Extension config (Manifest V3)
├── newtab.html         # Main HTML page
├── styles.css          # All styles (CSS variables + themes)
├── script.js           # All JavaScript logic
├── icons/
│   ├── *.svg          # Inline SVG icons
│   └── png/           # Extension icons (16/48/128px)
├── archive/           # Old versions (gitignored)
├── .cursor/           # Cursor AI plans (gitignored)
└── .opencode/         # Opencode skills (gitignored)
```

---

## Common Patterns

### Adding a New Theme Color

1. Add to `:root` in `styles.css`:
```css
:root { --c-new-color: #fff; }
```

2. Add to dark mode overrides:
```css
@media (prefers-color-scheme: dark) {
    :root { --c-new-color: #000; }
}
```

3. Add to JavaScript theme methods if dynamic switching is needed

### Adding a New Quick Link Icon

Icons are embedded as inline SVGs in `newtab.html`. For new icons:
1. Add SVG markup directly in HTML
2. Or add as a data URL in `script.js` (for dynamic loading)

---

## Browser Extension Specific

### Manifest V3 Permissions
Current permissions: `storage`
- `storage`: For saving user preferences and quick links
- No `activeTab` needed for new tab pages

### Chrome Storage Limits
- `chrome.storage.sync`: 100KB limit, ~512 keys
- Use `chrome.storage.local` for larger data if needed

### Security
- No `eval()` or inline scripts
- Validate all user input before storage
- Use HTTPS for all external resources

---

## Extension Development Tips

1. **Hot Reload**: Use "Update" button on `chrome://extensions/` after changes
2. **Debug JavaScript**: Right-click → Inspect on new tab page
3. **Check Storage**: Chrome DevTools → Application → Storage → Extension Storage
4. **Clear State**: Click "Clear storage" in DevTools to reset extension data
