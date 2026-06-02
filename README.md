# Kitreal Capture Chrome Extension

A production-ready Manifest V3 Chrome extension focused on full-page screenshot capture with a generous free tier and premium roadmap.

## Realistic feature set

### Free features (generous tier)
- Visible area capture (PNG)
- Full-page stitched capture (PNG)
- Timestamped file naming and Save-As downloads
- Works on most public and authenticated pages (active tab permission flow)

### Premium features (`$5/month` via ExtensionPay)
- Premium full-page workflow with PDF-ready export tab
- Priority handling for large-page capture quality
- Upgrade flow wired to ExtensionPay extension id `kit`
- Roadmap-ready hooks for batch capture, cloud sync, and scheduling

## Tech stack
- **Chrome Extension Manifest V3**
- **Service Worker** (`background.js`) for capture orchestration
- **ExtPay SDK** (`ExtPay.js`) for subscription checks and checkout
- **Chrome APIs**: `tabs`, `scripting`, `downloads`, `storage`
- **Popup UI**: plain HTML/CSS/JS (lightweight, no framework)
- **Packaging**: Bash + `zip` (`package-extension.sh`)

## ExtensionPay setup
- Extension id configured in code as: `kit`
- Upgrade entry point uses `extpay.openPaymentPage()` with id `kit`
- Price target: **$5 USD monthly** (configured in ExtensionPay dashboard)

## Local install
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repo directory: `/tmp/workspace/jaredssss/Kitreal3`

## Create a publishable zip
```bash
cd /tmp/workspace/jaredssss/Kitreal3
./package-extension.sh
```

Output:
- `/tmp/workspace/jaredssss/Kitreal3/release/kitreal-capture-extension.zip`
