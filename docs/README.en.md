# Minimal New Tab Extension

English | [中文](../README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimal new tab extension for Chrome and Microsoft Edge.

## 🚀 Installation

### Load Unpacked (Chrome / Edge)

1. **Download Project**
   ```bash
   git clone https://github.com/Planetes1mal/minimal-new-tab.git
   cd minimal-new-tab
   ```

2. **Open Extensions Page**
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. **Enable Developer Mode**
   
4. **Load Extension**
   - Click "Load unpacked"
   - Select the project root directory

5. **Start Using**：Open a new tab to see it in action

## 📖 Usage Guide

### Search Functionality
- Type keywords in the search box
- Click the left icon to switch search engines (Google/Bing)
- Press Enter or click the search icon to search

### Quick Links Management
- **Add Links**: Click the "+" button, fill in name and URL
- **Edit Links**: Right-click on existing links to edit
- **Delete Links**: Hover over links and click the "×" button
- **Icon Selection**:
  - Minimal Generation: Uses first letter of website name
  - Website Default: Automatically fetches website favicon
  - Custom URL: Manually input icon address

### Theme Switching
- Click the icon in the bottom-right corner
- Supports light mode, dark mode, and system follow
- Settings are automatically saved

## 🛠️ Technical Features

### Modern Tech Stack
- **Pure Native**: HTML5 + CSS3 + JavaScript
- **CSS Variables**: Complete theme system
- **Performance Optimized**: Lightweight and fast loading

### Browser Compatibility
- ✅ Chrome 88+
- ✅ Microsoft Edge 88+

### Permissions
- `storage`: Save user settings and quick links
- `activeTab`: New tab page access

## 📁 Project Structure

```
minimal-new-tab/
├── manifest.json         # Extension manifest
├── newtab.html           # New tab HTML
├── styles.css            # Styles (includes theme system)
├── script.js             # JavaScript logic
├── icons/                # Icon assets
│   ├── google.svg        # Google icon
│   ├── bing.svg          # Bing icon
│   ├── search.svg        # Search icon
│   ├── sun.svg           # Sun icon
│   ├── moon.svg          # Moon icon
│   └── icons/  
│       └── icon*.png     # Extension icons
├── docs/                 # Documentation
│   └── README.en.md      # English documentation
└── README.md             # Chinese documentation
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

Thanks to all developers who have contributed to this project!

---

If you prefer Chinese documentation, please read [README.md](../README.md).

