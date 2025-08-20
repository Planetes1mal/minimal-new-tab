# Minimal New Tab Extension

English | [中文](../README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A minimal new tab extension for Chrome and Microsoft Edge. It shows the current time and date, provides a search box with icon-based engine switcher (Google/Bing), a magnifier search button icon, and customizable quick links.

## Features

- **Live time and date** displayed in the center
- **Search box** with engine switcher (Google, Bing) using icons
- **Custom quick links**: add/remove/manage your favorite websites
- **Minimal UI**: clean and distraction-free

## Installation

### Load unpacked (Chrome / Edge)

1. Download or clone this repository to a local folder
2. Open the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable Developer mode
4. Click “Load unpacked”
5. Select the project root folder
6. Open a new tab to see it in action

## Usage

- **Search**: type keywords, choose a search engine, press Enter or click the search icon
- **Add quick link**: click the “+” tile, enter name and URL, then Save
- **Delete quick link**: hover a link and click the “×” button

Tip: the engine selector on the left and the expanded options both display icons; the right button is a magnifier icon.

## Project Structure

- `manifest.json`: extension manifest
- `newtab.html`: new tab markup
- `styles.css`: styling
- `script.js`: logic
- `icons/`: icons

## Notes

- The extension uses the `storage` permission to store your preferred search engine and quick links
- No personal data or browsing data is collected

---

If you prefer Chinese documentation, please read [README.md](../README.md).


