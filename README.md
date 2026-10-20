# 🍁 WellBot CA — Well.ca Auto-Purchase Bot

**Version:** 2.0
**Type:** Tampermonkey / Violentmonkey userscript (browser extension script)
**Target site:** [well.ca](https://well.ca) (Canadian online retailer, ZenCart-based)
**Author:** Pythonic Shariful

WellBot CA is a single-file automation bot that runs entirely in your browser on `well.ca`. It watches one or more product pages, logs into your account, adds products to the cart at the maximum allowed quantity, completes checkout, places the order, and — when items are out of stock — sits in a low-profile background restock monitor that pounces the moment inventory returns.

---

## ⚠️ Disclaimer & Responsible Use

- This script automates real purchases with real payment methods. **You are solely responsible for every order it places.** Always keep **Auto Place Order** disabled until you have verified the bot's behavior with test runs.
- Automating purchases may be restricted by well.ca's Terms of Service. Review the site's terms and use the bot at your own discretion and risk.
- The background monitor deliberately randomizes request timing and uses cache-busting fetches to reduce server load. Do not lower the poll delay below ~1 second.
- **Never share your configured script file or Tampermonkey storage backup** — it contains your login credentials and (optionally) payment details in plaintext.

---

## ✨ Features

### Core Automation
- **Multi-product targeting** — paste any number of product URLs (one per line or comma-separated); the bot walks the queue in order.
- **Max-Quantity Auto-Add** — reads well.ca's `#minmaxInfo` purchase limit and automatically clamps to the maximum allowed quantity, or uses a fixed custom quantity.
- **Auto-Login** — detects the header `Sign-In / Register` link (`#link_login_form`), opens the login form, types your credentials, submits, and verifies the session.
- **Auto Add-to-Cart** — clicks *Add to Cart* and confirms success via five independent signals (cart counter increment, mini-cart row count, empty-state removal, confirmation popup, cart dropdown DOM change).
- **Turbo Drop Mode** — bypasses page rendering entirely: adds items straight to the cart via a background API POST to well.ca's ZenCart `add_product` endpoint (~80ms), then jumps directly to checkout, skipping the cart page.
- **Auto Checkout** — selects shipping, auto-fills card number / expiry month / expiry year / CVV, and accepts the terms checkbox.
- **Auto Place Order** — locates `#confirm_purchase`, clicks it with randomized human-like delays, and retries for up to 3 minutes while the server processes; detects success by URL and confirmation-page keywords.
- **Restock Loop** — after a successful order (or when all targets are OOS), restarts the cycle automatically after a cooldown.

### Background Restock Monitor
- **Zero-navigation polling** — stays parked on any page and silently fetches each product URL via `GM_xmlhttpRequest` with anti-CDN cache busters; no page reloads.
- **Four out-of-stock signals** — discontinued label, *Notify Me* button, hidden add-to-cart form, and text phrases ("sold out", "out of stock", …), plus a positive in-stock check (visible form + Add to Cart button).
- **Randomized intervals** — configurable min/max delay (default 1.5s–3.5s) with a 500ms gap between requests in the same cycle.
- On restock: sound chime, webhook alert, then Turbo direct-cart + instant checkout jump (or standard page navigation as fallback).

### Humanization ("Biometric Simulation") Engine
- **Gaussian-distributed delays** (Box–Muller) instead of uniform randomness for every wait.
- **Multi-event clicks** — pointer + mouse event sequences (over/enter/move/down/up/click) with micro-tremor movements, realistic non-centered click coordinates, hold duration, focus, and a native `.click()` safety net.
- **Natural typing** — per-character keydown/keypress/keyup with hold latency, extra pauses after spaces/`@`/`.`, and React/ZenCart `_valueTracker`-aware native value setter sync.
- **Dropdown simulation** — native setter + `input`/`change` events for `<select>` elements.
- **Cancellable sleeps** — every wait aborts instantly when you press STOP.
- **Overlay dismissal** — auto-closes cookie banners, newsletter modals, and lightbox popups before acting.

### UI, Alerts & Persistence
- **Draggable HUD console** — dark glass panel (bottom-right, minimizable) with three tabs (**Targets**, **Account**, **Engine**), a live activity log, and a status badge (IDLE / RUNNING / MONITORING / STOPPED).
- **Sound synthesizer** — Web Audio chimes for in-stock detection and order success.
- **Discord webhook + native browser notifications** — rich embeds on restock and order confirmation.
- **Cross-tab state sync** — configuration and execution state persist in Tampermonkey storage (`GM_setValue` / `GM_getValue`), so the bot resumes correctly across page navigations and survives reloads.
- **Session heartbeat** — hits the account page every 3 minutes to keep the login session alive.
- **Iframe-safe** — refuses to run inside sandboxed/tracking iframes (`window.top !== window.self` guard).

---

## 📋 Requirements

| Requirement | Notes |
|---|---|
| **Browser** | Chrome, Edge, Firefox, Brave, or any Chromium/Gecko browser with extension support |
| **Extension** | [Tampermonkey](https://www.tampermonkey.net/) (recommended) or [Violentmonkey](https://violentmonkey.github.io/) |
| **Permissions used** | `GM_setValue`, `GM_getValue`, `GM_addValueChangeListener`, `GM_xmlhttpRequest`, `GM_notification` |
| **Account** | A well.ca account with a valid shipping address (and payment method saved or entered by the bot) |
| **Network** | Access to `well.ca`; Discord webhook access is optional |

> **Note:** The script matches `https://well.ca/*` and `https://*.well.ca/*`, runs at `document-idle`, and declares `@noframes`.

---

## 🛠️ Installation

1. **Install Tampermonkey** (if you don't have it) from your browser's extension store:
   - [Chrome / Edge / Brave Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)

2. **Open the Tampermonkey dashboard** → click **＋ Create a new script**.

3. **Delete the default template** in the editor, then paste the entire contents of [`WellCA Bot Script.js`](./WellCA%20Bot%20Script.js).

4. **Save** with `Ctrl+S` / `Cmd+S` (or File → Save). The script's header already declares every needed `@match` rule and `@grant`, so no extra configuration is required.

5. **Verify installation** — visit [https://well.ca](https://well.ca). The **WellBot CA** HUD panel should appear in the bottom-right corner after the page finishes loading.

6. *(Optional)* Keep Tampermonkey's icon badge enabled so you can quickly toggle the script on/off.

To uninstall: disable or delete the script in the Tampermonkey dashboard. No other cleanup is needed.

---

## 🚀 Usage

### 1. Configure your targets
Open the HUD → **🎯 Targets** tab:
- Paste one or more product URLs, one per line:
  ```
  https://well.ca/products/schylling-needoh-peace-o-cake_347476.html
  https://well.ca/products/schylling-needoh-snow-ball-crunch_192721.html
  ```
- Pick **⚡ Max (Auto)** to always buy the maximum quantity allowed per product, or **🔢 Fixed Amount** and type a specific quantity (1–99). Changes save automatically on blur/change.

### 2. Enter your account
**🔑 Account** tab:
- Account **Email** and **Password** for well.ca.
- These are stored locally in Tampermonkey's script storage (plaintext). Use a dedicated/throwaway account if you are concerned about exposure.

### 3. Tune the engine
**⚙️ Engine** tab:
| Toggle / Field | What it does |
|---|---|
| ⚡ **Turbo Drop Mode** | Direct background API carting; skips the cart page (recommended ON) |
| **Auto-Login** | Signs in automatically when the session is missing/expired |
| **Auto Checkout** | Proceeds to checkout as soon as the cart is filled |
| **Auto Place Order** | Submits the final order without pausing — **leave OFF until you trust the setup** |
| **Repeat Restock Loop** | Keeps cycling / monitoring until targets go out of stock |
| **Min / Max Delay (sec)** | Randomized delay between restock check cycles (default 1.5–3.5s) |
| **Discord Webhook URL** | Optional; sends rich embed alerts on restock and order success |

> Payment fields (card number, expiry, CVV, cardholder name) are configured in the script's `DEFAULT_CONFIG` object near the top of the file — edit them there if you want full auto-payment. Leaving `cardNumber` empty makes the bot skip payment auto-fill so you can complete it manually.

### 4. Run it
Buttons at the bottom of the HUD:

| Button | Action |
|---|---|
| ▶ **START BOT** | Starts the full pipeline: login → cart all targets → checkout → place order (per your toggles). If the bot is already mid-flow (e.g. on the checkout page after a reload), it resumes from the current page. |
| 🔑 **LOGIN** | Manually triggers only the login flow. |
| ⏹ **STOP** | Immediately halts execution, cancels all pending waits/timers, and resets state to IDLE. |

The header badge shows the live phase: `IDLE` → `STARTING` → `LOGIN` → `ADDING_PRODUCTS` → `IN_CART` → `CHECKOUT` → `ORDER_COMPLETE`, or `MONITORING` while polling for restocks. The **Live Activity Log** at the bottom of the HUD streams every action with timestamps (also mirrored to the browser console as `[WellBot …]`).

### 5. What happens when a product is out of stock
If every target is OOS (and **Repeat Restock Loop** is on), the bot parks on a neutral page and enters **Background Monitor** mode: it silently polls each URL at your randomized interval. The moment one is back in stock you get a chime + alert, and the bot either Turbo-carts it via API or navigates to the product page to complete the normal purchase flow.

---

## ⚙️ Configuration Reference

All settings live in `DEFAULT_CONFIG` inside the script and are overridden by values saved from the HUD (`WELLBOT_CONFIG_V2` in Tampermonkey storage).

| Key | Default | Description |
|---|---|---|
| `productUrls` | 2 sample URLs | Array of target product page URLs |
| `quantityMode` | `'MAX'` | `'MAX'` = auto max per product, or `'CUSTOM'` |
| `customQuantity` | `1` | Fixed quantity when mode is `CUSTOM` |
| `email` / `password` | *(empty/placeholder — set yours)* | well.ca login credentials |
| `cardholderName` | — | Name on card (for checkout) |
| `cardNumber` / `cardExpiryMonth` / `cardExpiryYear` / `cardCvv` | `''` | Payment details; empty `cardNumber` disables auto payment-fill |
| `turboMode` | `true` | Direct API carting + skip cart page |
| `autoLogin` | `true` | Auto sign-in when logged out |
| `autoCheckout` | `true` | Auto proceed to checkout |
| `autoPlaceOrder` | `true` | Auto submit the final order |
| `repeatLoopOOS` | `true` | Restock monitoring / repeat cycles |
| `pollMinDelay` / `pollMaxDelay` | `1.5` / `3.5` | Randomized restock poll interval (seconds) |
| `pollIntervalMs` | `2500` | Legacy fallback poll interval |
| `stepDelayMs` | `1200` | Base step delay |
| `discordWebhook` | `''` | Discord webhook URL for alerts |
| `telegramBotToken` / `telegramChatId` | `''` | Reserved for Telegram alerts (not yet wired) |
| `compactMode` | `true` | UI appearance flag |

Runtime state is stored separately under `WELLBOT_STATE_V2` (running flag, phase, product index, added products, cycle count, OOS list).

---

## 🔒 Security Notes

- **The script ships with empty credential placeholders.** `DEFAULT_CONFIG` contains no baked-in email, password, or cardholder name — enter yours through the HUD (or fill them in locally). Never commit or share a copy of the file after you've put real credentials in it, and never open issues/PRs with a filled-in version attached.
- Credentials, payment details, and state persist **unencrypted** in Tampermonkey's extension storage. Clear them from the HUD (or reset Tampermonkey storage) when finished.
- The bot sends data only to `well.ca` and, if configured, your own Discord webhook. It makes no other external requests (aside from loading the Inter font from Google Fonts for the HUD).
- Consider disabling **Auto Place Order** and completing the final step manually if you are running the bot unattended for the first time.

---

## 🧩 Troubleshooting

| Symptom | Fix |
|---|---|
| HUD does not appear | Confirm Tampermonkey is enabled, the script is active for `well.ca`, and you are on the top-level page (not an iframe). Hard-refresh with `Ctrl+Shift+R`. |
| Login fails | Re-check email/password in the **Account** tab. Well.ca may be showing a CAPTCHA or have changed its login markup — update `performLoginFlow()` selectors if so. |
| "Item is OUT OF STOCK" despite being available | The bot polls for 4 seconds for the Add to Cart button; slow connections may need a longer poll in `handleProductPage()`. |
| Add-to-cart not detected | The bot falls back to form submission after 1.5s; verify the mini-cart loads, and check the Live Activity Log for which success signal (if any) fired. |
| Checkout payment not filled | Ensure `cardNumber` is set in `DEFAULT_CONFIG`; selectors assume well.ca's ZenCart one-page checkout IDs (`#creditcard_number`, etc.). |
| Place Order times out after 3 minutes | The button may be disabled while the server processes, or a validation error (address/payment) is blocking submission — complete checkout manually and read the on-page error. |
| Monitor stops after a while | The loop halts if state changes (`running`/`phase`) or a navigation occurs. Press **START** again to resume; cross-tab state persists across reloads. |

---

## 📁 Project Structure

```
.
├── WellCA Bot Script.js   # The complete userscript (install this)
└── README.md              # This file
```

The script is organized into numbered sections inside the single IIFE:

| # | Section |
|---|---|
| 0 | Biometric simulation & humanization engine |
| 1 | Configuration, storage & state management |
| 2 | Discord & Telegram webhook alerts |
| 3 | Sound synthesizer |
| 4 | UI HUD console |
| 5 | Bot execution engine & state machine |
| 6–9 | Page handlers: Login, Product, Cart, Checkout OnePage |
| 10 | Background fetch stock monitor & Turbo Drop engine |
| 11 | Initialization & session heartbeat |

---

*WellBot CA v2.0 · Auto-Purchase Engine 🍁*
