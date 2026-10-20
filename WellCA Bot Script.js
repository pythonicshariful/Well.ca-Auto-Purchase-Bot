// ==UserScript==
// @name         Well.ca Auto-Purchase Bot
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Advanced multi-product auto-purchase bot for well.ca with Max-Quantity Auto-Add, Combined Checkout, Auto-Payment, Restock Loop & Biometric Simulation
// @author       Pythonic Shariful
// @match        https://well.ca/*
// @match        https://*.well.ca/*
// @noframes
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // Strictly prevent running inside sandboxed or tracking iframes
    if (window.top !== window.self) {
        return;
    }

    // =========================================================================
    // 0. ADVANCED BIOMETRIC SIMULATION & HUMANIZATION ENGINE
    // =========================================================================

    // Cancellable biometric sleep: immediately awakens if bot is stopped
    const sleep = (ms) => new Promise(r => {
        const timer = setTimeout(r, ms);
        const interval = setInterval(() => {
            if (typeof isExecutionStopped === 'function' && isExecutionStopped()) {
                clearTimeout(timer);
                clearInterval(interval);
                r();
            }
        }, 60);
        setTimeout(() => clearInterval(interval), ms + 20);
    });

    // Box-Muller Gaussian normal distribution random number generator
    function gaussianRandom(mean, stdDev, min = null, max = null) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        let result = mean + num * stdDev;
        if (min !== null && result < min) result = min;
        if (max !== null && result > max) result = max;
        return result;
    }

    // Realistic non-centered click coordinates inside element boundaries
    function getRandomElementCoordinates(element) {
        const rect = element.getBoundingClientRect();
        const offsetX = rect.width * (0.25 + Math.random() * 0.5);
        const offsetY = rect.height * (0.25 + Math.random() * 0.5);

        const clientX = Math.round(rect.left + offsetX);
        const clientY = Math.round(rect.top + offsetY);
        const pageX = clientX + window.scrollX;
        const pageY = clientY + window.scrollY;
        const screenX = clientX + (window.screenX || 0);
        const screenY = clientY + (window.screenY || 0);

        return { clientX, clientY, pageX, pageY, screenX, screenY, rect };
    }

    function getInputDeviceCaps() {
        try {
            return window.InputDeviceCapabilities ? new InputDeviceCapabilities({ firesTouchEvents: false }) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Safely dispatch synthetic events without throwing on proxy/Window mismatch.
     */
    function dispatchSafe(element, EventClass, type, init = {}) {
        if (!element) return;
        try {
            element.dispatchEvent(new EventClass(type, init));
        } catch (e1) {
            try {
                // If strict constructor fails, dispatch standard Event with bubbles
                element.dispatchEvent(new Event(type, { bubbles: init.bubbles !== false, cancelable: true }));
            } catch (e2) {}
        }
    }

    /**
     * Checks if an element is currently visible and interactable in DOM.
     */
    function isElementVisible(el) {
        if (!el) return false;
        try {
            if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return false;
            const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return false;
            return true;
        } catch (e) {
            return !!(el.offsetWidth > 0 || el.offsetHeight > 0 || (el.getBoundingClientRect && el.getBoundingClientRect().width > 0));
        }
    }

    /**
     * Finds the first genuinely visible element matching selector, avoiding hidden dropdown clones.
     */
    function findVisibleElement(selector) {
        try {
            const candidates = Array.from(document.querySelectorAll(selector));
            if (candidates.length === 0) return null;
            for (const el of candidates) {
                if (isElementVisible(el)) return el;
            }
            return candidates[0]; // fallback
        } catch (e) {
            return document.querySelector(selector);
        }
    }

    // Multi-event human click (PointerEvent + MouseEvent + Micro-jitters + Focus)
    async function simulateHumanClick(element) {
        if (!element) return;

        try {
            const rect = element.getBoundingClientRect();
            const isInViewport = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );

            if (!isInViewport) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                await sleep(gaussianRandom(200, 50, 120, 350));
            }
        } catch (e) {}

        const coords = getRandomElementCoordinates(element);

        // Standard pointer / mouse init without 'view' to prevent Tampermonkey Window proxy errors
        const pointerInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: coords.clientX,
            clientY: coords.clientY,
            screenX: coords.screenX,
            screenY: coords.screenY,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true
        };

        const mouseInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: coords.clientX,
            clientY: coords.clientY,
            screenX: coords.screenX,
            screenY: coords.screenY
        };

        const PEvent = window.PointerEvent || MouseEvent;
        dispatchSafe(element, PEvent, 'pointerover', pointerInit);
        dispatchSafe(element, PEvent, 'pointerenter', { ...pointerInit, bubbles: false });
        dispatchSafe(element, MouseEvent, 'mouseover', mouseInit);
        dispatchSafe(element, MouseEvent, 'mouseenter', { ...mouseInit, bubbles: false });

        // Micro tremor movements
        for (let i = 0; i < 2; i++) {
            const jitterX = coords.clientX + (Math.random() * 4 - 2);
            const jitterY = coords.clientY + (Math.random() * 4 - 2);
            dispatchSafe(element, PEvent, 'pointermove', { ...pointerInit, clientX: jitterX, clientY: jitterY });
            dispatchSafe(element, MouseEvent, 'mousemove', { ...mouseInit, clientX: jitterX, clientY: jitterY });
            await sleep(gaussianRandom(12, 4, 5, 25));
        }

        dispatchSafe(element, PEvent, 'pointerdown', { ...pointerInit, button: 0, buttons: 1 });
        dispatchSafe(element, MouseEvent, 'mousedown', { ...mouseInit, button: 0, buttons: 1 });

        if (typeof element.focus === 'function') {
            try { element.focus(); } catch (e) {}
        }

        // Hold duration (click down to click up)
        await sleep(gaussianRandom(65, 18, 35, 130));

        dispatchSafe(element, PEvent, 'pointerup', { ...pointerInit, button: 0, buttons: 0 });
        dispatchSafe(element, MouseEvent, 'mouseup', { ...mouseInit, button: 0, buttons: 0 });
        dispatchSafe(element, MouseEvent, 'click', { ...mouseInit, button: 0, buttons: 0 });

        // Direct native click invocation ensures form submission and navigation fire reliably
        if (typeof element.click === 'function') {
            try { element.click(); } catch (e) {}
        }
    }

    // Natural keystroke dynamics with React/vanilla input sync
    async function simulateHumanType(element, text) {
        if (!element) return;

        await simulateHumanClick(element);
        await sleep(gaussianRandom(100, 30, 50, 200));

        try {
            element.value = '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {}

        let accumulated = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            accumulated += char;

            const keyInit = {
                key: char,
                code: `Key${char.toUpperCase()}`,
                bubbles: true,
                cancelable: true,
                composed: true
            };

            dispatchSafe(element, KeyboardEvent, 'keydown', keyInit);
            dispatchSafe(element, KeyboardEvent, 'keypress', keyInit);

            // Hold latency
            await sleep(gaussianRandom(40, 12, 20, 80));

            // React/ZenCart value sync
            try {
                const proto = (window.HTMLInputElement || element.ownerDocument?.defaultView?.HTMLInputElement)?.prototype;
                const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
                if (nativeSetter) {
                    if (element._valueTracker) {
                        element._valueTracker.setValue('__val__' + Math.random());
                    }
                    nativeSetter.call(element, accumulated);
                } else {
                    element.value = accumulated;
                }
            } catch (e) {
                element.value = accumulated;
            }

            dispatchSafe(element, Event, 'input', { bubbles: true, composed: true });
            dispatchSafe(element, KeyboardEvent, 'keyup', keyInit);

            // Inter-key latency (slightly longer after space, dot, or @)
            let interKeyDelay = gaussianRandom(75, 25, 30, 160);
            if (char === ' ' || char === '@' || char === '.') {
                interKeyDelay += gaussianRandom(110, 30, 60, 220);
            }
            await sleep(interKeyDelay);
        }

        // Guarantee final value is accurately set
        if (element.value !== text) {
            try {
                const proto = (window.HTMLInputElement || element.ownerDocument?.defaultView?.HTMLInputElement)?.prototype;
                const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
                if (nativeSetter) {
                    nativeSetter.call(element, text);
                } else {
                    element.value = text;
                }
            } catch (e) {
                element.value = text;
            }
            dispatchSafe(element, Event, 'input', { bubbles: true, composed: true });
        }

        dispatchSafe(element, Event, 'change', { bubbles: true });
        dispatchSafe(element, Event, 'blur', { bubbles: true });
    }

    // Dropdown / Select human simulation
    async function simulateHumanSelect(selectElement, targetValueOrText) {
        if (!selectElement) return false;
        await simulateHumanClick(selectElement);
        await sleep(gaussianRandom(150, 40, 90, 250));

        let optionFound = false;
        const options = Array.from(selectElement.options);

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (opt.value === targetValueOrText || opt.text.trim().toLowerCase() === String(targetValueOrText).trim().toLowerCase()) {
                selectElement.selectedIndex = i;
                optionFound = true;
                break;
            }
        }

        if (!optionFound && options.length > 0) {
            // Pick highest available numeric value if requesting max
            if (targetValueOrText === 'MAX') {
                selectElement.selectedIndex = options.length - 1;
                optionFound = true;
            }
        }

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        if (nativeSetter) {
            nativeSetter.call(selectElement, selectElement.options[selectElement.selectedIndex].value);
        }

        selectElement.dispatchEvent(new Event('input', { bubbles: true }));
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        return optionFound;
    }

    // Dismiss intrusive popups, newsletters, or cookie banners
    function dismissOverlays() {
        const dismissSelectors = [
            '#cookie-accept-btn',
            '#cookie-consent-accept',
            '.cookie-modal-close',
            'button#onetrust-accept-btn-handler',
            '.modal-header .close',
            '.modal .close',
            '[aria-label="Close"]',
            '#cboxClose',
            '.popup-close',
            '.newsletter-popup-close',
            '#newsletter-modal .close',
            '.featherlight-close'
        ];

        for (const selector of dismissSelectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) {
                try {
                    el.click();
                    log(`Closed overlay: ${selector}`, 'info');
                } catch (e) {}
            }
        }
    }

    // =========================================================================
    // 1. CONFIGURATION, STORAGE & STATE MANAGEMENT
    // =========================================================================

    const CONFIG_KEY = 'WELLBOT_CONFIG_V2';
    const STATE_KEY = 'WELLBOT_STATE_V2';

    const DEFAULT_CONFIG = {
        // Targets (comma or newline separated list of product URLs)
        productUrls: [
            'https://well.ca/products/schylling-needoh-peace-o-cake_347476.html',
            'https://well.ca/products/schylling-needoh-snow-ball-crunch_192721.html'
        ],
        // Quantity mode: 'MAX' (auto-detect max allowed) or fixed number
        quantityMode: 'MAX',
        customQuantity: 1,

        // Authentication — SECURITY: never commit real credentials to this file.
        // Enter them via the HUD "Account" tab, or fill in locally and keep this file private.
        email: '',
        password: '',

        // Payment Details (Auto-fill on checkout) — leave cardNumber empty to fill manually
        cardholderName: '',
        cardNumber: '',
        cardExpiryMonth: '', // e.g. '12'
        cardExpiryYear: '',  // e.g. '28'
        cardCvv: '',

        // Execution flags
        turboMode: true,     // Turbo Drop Mode: background direct API carting & instant checkout jump
        autoLogin: true,
        autoCheckout: true,
        autoPlaceOrder: true,
        repeatLoopOOS: true, // Repeat cycle until items become out of stock
        pollMinDelay: 1.5,   // Min monitor random delay (seconds)
        pollMaxDelay: 3.5,   // Max monitor random delay (seconds)
        pollIntervalMs: 2500, // Legacy fallback
        stepDelayMs: 1200,    // Base step delay

        // Notifications
        discordWebhook: '',
        telegramBotToken: '',
        telegramChatId: '',

        // UI appearance
        compactMode: true
    };

    function loadConfig() {
        try {
            const saved = GM_getValue(CONFIG_KEY, null);
            return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
        } catch (e) {
            return { ...DEFAULT_CONFIG };
        }
    }

    function saveConfig(cfg) {
        GM_setValue(CONFIG_KEY, JSON.stringify(cfg));
    }

    const DEFAULT_STATE = {
        running: false,
        phase: 'IDLE', // 'IDLE', 'LOGIN', 'ADDING_PRODUCTS', 'IN_CART', 'CHECKOUT', 'ORDER_COMPLETE', 'MONITORING'
        currentProductIndex: 0,
        addedProducts: [], // array of { url, title, qty, timestamp }
        cycleCount: 0,
        lastError: null,
        oosProducts: [] // tracks products that are out of stock
    };

    function loadState() {
        try {
            const saved = GM_getValue(STATE_KEY, null);
            return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : { ...DEFAULT_STATE };
        } catch (e) {
            return { ...DEFAULT_STATE };
        }
    }

    function saveState(st) {
        GM_setValue(STATE_KEY, JSON.stringify(st));
    }

    let isBotActive = false;

    function isExecutionStopped() {
        if (!isBotActive) return true;
        try {
            const saved = typeof GM_getValue === 'function' ? GM_getValue(STATE_KEY, null) : null;
            if (saved) {
                const parsed = JSON.parse(saved);
                if (!parsed.running) {
                    isBotActive = false;
                    return true;
                }
            } else {
                isBotActive = false;
                return true;
            }
        } catch (e) {}
        return false;
    }

    function resetBotState() {
        isBotActive = false;
        const st = loadState();
        st.running = false;
        st.phase = 'IDLE';
        st.currentProductIndex = 0;
        st.addedProducts = [];
        st.oosProducts = [];
        saveState(st);
        updateUI();
    }

    // =========================================================================
    // 2. DISCORD & TELEGRAM WEBHOOK ALERTS
    // =========================================================================

    function sendWebhookNotification(title, message, fields = []) {
        const cfg = loadConfig();

        // Discord Webhook
        if (cfg.discordWebhook && cfg.discordWebhook.startsWith('https://discord.com/api/webhooks/')) {
            const embed = {
                title: `🇨🇦 WellBot Alert: ${title}`,
                description: message,
                color: 0x22c55e, // Bright Green
                fields: fields.map(f => ({ name: f.name, value: String(f.value), inline: true })),
                footer: { text: 'Well.ca Auto-Purchase Bot v2.0' },
                timestamp: new Date().toISOString()
            };

            GM_xmlhttpRequest({
                method: 'POST',
                url: cfg.discordWebhook,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ embeds: [embed] }),
                onload: () => log('Discord notification delivered.', 'success'),
                onerror: (e) => log(`Discord webhook failed: ${e.statusText || e}`, 'error')
            });
        }

        // Native Browser Notification
        if (typeof GM_notification === 'function') {
            GM_notification({
                title: `WellBot: ${title}`,
                text: message,
                timeout: 6000
            });
        }
    }

    // =========================================================================
    // 3. SOUND SYNTHESIZER FOR RESTOCK / CHECKOUT CHIMES
    // =========================================================================

    function playBeep(type = 'success') {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            } else if (type === 'alert') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.4);
            }
        } catch (e) {}
    }

    // =========================================================================
    // 4. UI HUD CONSOLE (COMPACT ERGONOMIC DESIGN ~275px)
    // =========================================================================

    let hudRoot = null;
    let consoleBox = null;
    let statusBadge = null;

    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[WellBot ${timestamp}] ${message}`);

        if (consoleBox) {
            const entry = document.createElement('div');
            entry.style.marginBottom = '3px';
            entry.style.fontSize = '11px';
            entry.style.lineHeight = '1.5';
            entry.style.fontFamily = '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace';
            entry.style.paddingBottom = '2px';
            entry.style.borderBottom = '1px solid rgba(255,255,255,0.03)';

            let color = '#475569';
            let prefix = '·';
            if (type === 'success')   { color = '#4ade80'; prefix = '✔'; }
            else if (type === 'warn') { color = '#fbbf24'; prefix = '⚠'; }
            else if (type === 'error'){ color = '#f87171'; prefix = '✖'; }
            else if (type === 'highlight') { color = '#38bdf8'; prefix = '▶'; }

            const tsSpan = document.createElement('span');
            tsSpan.style.color = '#1e3a5f';
            tsSpan.textContent = timestamp + ' ';

            const prefSpan = document.createElement('span');
            prefSpan.style.color = color;
            prefSpan.style.marginRight = '5px';
            prefSpan.textContent = prefix;

            const msgSpan = document.createElement('span');
            msgSpan.style.color = color;
            msgSpan.textContent = message;

            entry.appendChild(tsSpan);
            entry.appendChild(prefSpan);
            entry.appendChild(msgSpan);

            consoleBox.appendChild(entry);
            consoleBox.scrollTop = consoleBox.scrollHeight;

            while (consoleBox.children.length > 120) {
                consoleBox.removeChild(consoleBox.firstChild);
            }
        }
    }

    function createHUD() {
        if (document.getElementById('wellbot-hud-root')) return;

        // ── Inject Google Font (Inter) ────────────────────────────────────────
        if (!document.getElementById('wellbot-font')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'wellbot-font';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
            document.head.appendChild(fontLink);
        }

        // ── Inject global keyframe animations ─────────────────────────────────
        if (!document.getElementById('wellbot-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'wellbot-styles';
            styleEl.textContent = `
                @keyframes wb-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
                    50%       { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
                }
                @keyframes wb-pulse-amber {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
                    50%       { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
                }
                @keyframes wb-fadein {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes wb-scan {
                    0%   { background-position: 0 0; }
                    100% { background-position: 0 100px; }
                }
                #wellbot-hud-root * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif !important; }
                #wellbot-hud-root input, #wellbot-hud-root select, #wellbot-hud-root textarea {
                    outline: none !important;
                }
                #wellbot-hud-root input:focus, #wellbot-hud-root select:focus, #wellbot-hud-root textarea:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 2px rgba(59,130,246,0.25) !important;
                }
                #wellbot-hud-root button:hover { filter: brightness(1.15); }
                #wellbot-console::-webkit-scrollbar { width: 4px; }
                #wellbot-console::-webkit-scrollbar-track { background: transparent; }
                #wellbot-console::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
            `;
            document.head.appendChild(styleEl);
        }

        hudRoot = document.createElement('div');
        hudRoot.id = 'wellbot-hud-root';

        const cfg = loadConfig();

        // ── Root panel shell ──────────────────────────────────────────────────
        Object.assign(hudRoot.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '420px',
            backgroundColor: '#080f1f',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            zIndex: '2147483647',
            overflow: 'hidden',
            userSelect: 'none',
            animation: 'wb-fadein 0.3s ease',
            backdropFilter: 'blur(24px)'
        });

        // ── Gradient Header ───────────────────────────────────────────────────
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 12px',
            background: 'linear-gradient(135deg, #0d1f3c 0%, #0f2744 50%, #0c1a30 100%)',
            borderBottom: '1px solid rgba(59,130,246,0.15)',
            cursor: 'move',
            position: 'relative',
            overflow: 'hidden'
        });

        // Subtle animated shimmer line in header
        const headerShimmer = document.createElement('div');
        Object.assign(headerShimmer.style, {
            position: 'absolute', top: '0', left: '0', right: '0', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)',
            animation: 'wb-scan 3s linear infinite'
        });
        header.appendChild(headerShimmer);

        const titleBox = document.createElement('div');
        titleBox.style.cssText = 'display:flex;align-items:center;gap:10px;';

        // Logo with glow
        const logoWrap = document.createElement('div');
        Object.assign(logoWrap.style, {
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)'
        });
        logoWrap.textContent = '🍁';

        const titleMeta = document.createElement('div');

        const titleText = document.createElement('div');
        Object.assign(titleText.style, {
            fontWeight: '800', fontSize: '15px',
            letterSpacing: '-0.3px', color: '#f8fafc',
            lineHeight: '1.2'
        });
        titleText.textContent = 'WellBot CA';

        const titleSub = document.createElement('div');
        Object.assign(titleSub.style, {
            fontSize: '10px', color: '#64748b', fontWeight: '500', letterSpacing: '0.3px'
        });
        titleSub.textContent = 'Auto-Purchase Engine';

        titleMeta.appendChild(titleText);
        titleMeta.appendChild(titleSub);
        titleBox.appendChild(logoWrap);
        titleBox.appendChild(titleMeta);

        // Status badge with live dot
        const badgeWrap = document.createElement('div');
        badgeWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const liveDot = document.createElement('span');
        Object.assign(liveDot.style, {
            width: '8px', height: '8px',
            borderRadius: '50%',
            backgroundColor: '#475569',
            display: 'inline-block',
            transition: 'background-color 0.3s'
        });

        statusBadge = document.createElement('span');
        Object.assign(statusBadge.style, {
            fontSize: '10px',
            padding: '3px 10px',
            borderRadius: '20px',
            fontWeight: '700',
            backgroundColor: 'rgba(71,85,105,0.3)',
            color: '#94a3b8',
            border: '1px solid rgba(71,85,105,0.4)',
            letterSpacing: '0.5px'
        });
        statusBadge.textContent = 'IDLE';

        // Override updateStatusBadge to also animate the dot
        const _origUpdateBadge = updateStatusBadge;
        updateStatusBadge = function(text, color) {
            if (statusBadge) {
                statusBadge.textContent = text;
                statusBadge.style.backgroundColor = (color || '#475569') + '33';
                statusBadge.style.color = color || '#94a3b8';
                statusBadge.style.borderColor = (color || '#475569') + '66';
            }
            if (liveDot) {
                liveDot.style.backgroundColor = color || '#475569';
                liveDot.style.animation = color === '#22c55e' ? 'wb-pulse 1.5s infinite' :
                                          color === '#f59e0b' ? 'wb-pulse-amber 1.5s infinite' : 'none';
            }
        };

        badgeWrap.appendChild(liveDot);
        badgeWrap.appendChild(statusBadge);

        const headerRight = document.createElement('div');
        headerRight.style.cssText = 'display:flex;align-items:center;gap:8px;';
        headerRight.appendChild(badgeWrap);

        const minBtn = document.createElement('button');
        minBtn.innerHTML = '&#8211;';
        minBtn.title = 'Minimize';
        Object.assign(minBtn.style, {
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: '6px',
            lineHeight: '1.4',
            transition: 'background 0.15s'
        });
        headerRight.appendChild(minBtn);

        header.appendChild(titleBox);
        header.appendChild(headerRight);
        hudRoot.appendChild(header);

        // ── HUD Body ──────────────────────────────────────────────────────────
        const body = document.createElement('div');
        body.id = 'wellbot-body';
        body.style.cssText = 'padding:16px;';

        // Minimize handler
        let isMinimized = false;
        minBtn.onclick = () => {
            isMinimized = !isMinimized;
            body.style.display = isMinimized ? 'none' : 'block';
            minBtn.innerHTML = isMinimized ? '&#9633;' : '&#8211;';
        };

        // ── Premium Pill Tab Navigation ────────────────────────────────────────
        const tabNav = document.createElement('div');
        Object.assign(tabNav.style, {
            display: 'flex',
            gap: '4px',
            marginBottom: '14px',
            background: 'rgba(15,23,42,0.7)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
        });

        const tabs = [
            { id: 'tab-products', label: '🎯 Targets' },
            { id: 'tab-auth',     label: '🔑 Account' },
            { id: 'tab-settings', label: '⚙️ Engine' }
        ];

        let activeTab = 'tab-products';
        const tabButtons = {};
        const tabPanes = {};

        function setActiveTab(id) {
            activeTab = id;
            tabs.forEach(t => {
                const isActive = t.id === id;
                Object.assign(tabButtons[t.id].style, {
                    background: isActive ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.35)' : 'none'
                });
                tabPanes[t.id].style.display = isActive ? 'block' : 'none';
            });
        }

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.textContent = tab.label;
            Object.assign(btn.style, {
                flex: '1',
                padding: '7px 4px',
                fontSize: '11px',
                fontWeight: '600',
                background: tab.id === activeTab ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'transparent',
                color: tab.id === activeTab ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: tab.id === activeTab ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                whiteSpace: 'nowrap'
            });
            btn.onclick = () => setActiveTab(tab.id);
            tabButtons[tab.id] = btn;
            tabNav.appendChild(btn);
        });
        body.appendChild(tabNav);

        // --- TAB 1: TARGET PRODUCTS ---
        const paneProducts = document.createElement('div');
        paneProducts.id = 'pane-products';
        tabPanes['tab-products'] = paneProducts;

        // Section label helper
        function sectionLabel(text) {
            const el = document.createElement('div');
            Object.assign(el.style, {
                fontSize: '10px', fontWeight: '700', color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                marginBottom: '6px', marginTop: '4px'
            });
            el.textContent = text;
            return el;
        }

        paneProducts.appendChild(sectionLabel('Target Product URLs'));

        const prodTextarea = document.createElement('textarea');
        Object.assign(prodTextarea.style, {
            width: '100%',
            height: '75px',
            backgroundColor: '#0d1626',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '11px',
            padding: '8px 10px',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            resize: 'vertical',
            lineHeight: '1.6',
            transition: 'border 0.2s'
        });
        prodTextarea.placeholder = 'https://well.ca/products/...\nhttps://well.ca/products/...';
        prodTextarea.value = cfg.productUrls.join('\n');
        prodTextarea.onchange = () => {
            const lines = prodTextarea.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            const currentCfg = loadConfig();
            currentCfg.productUrls = lines;
            saveConfig(currentCfg);
            log(`Updated target product list (${lines.length} items)`);
        };
        paneProducts.appendChild(prodTextarea);

        // Quantity Mode & Custom Quantity Input
        const qtyRow = document.createElement('div');
        Object.assign(qtyRow.style, {
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginTop: '10px'
        });

        const qtyLabel = document.createElement('span');
        Object.assign(qtyLabel.style, { fontSize: '12px', color: '#94a3b8', fontWeight: '500' });
        qtyLabel.textContent = 'Quantity:';

        const qtyRight = document.createElement('div');
        qtyRight.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const qtySelect = document.createElement('select');
        Object.assign(qtySelect.style, {
            backgroundColor: '#0d1626',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px',
            fontSize: '11px',
            padding: '5px 10px',
            cursor: 'pointer'
        });

        [['MAX', '⚡ Max (Auto)'], ['CUSTOM', '🔢 Fixed Amount']].forEach(([v, t]) => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = t;
            qtySelect.appendChild(opt);
        });
        qtySelect.value = cfg.quantityMode || 'MAX';

        const customQtyInput = document.createElement('input');
        customQtyInput.type = 'number';
        customQtyInput.min = '1';
        customQtyInput.max = '99';
        customQtyInput.value = cfg.customQuantity || 1;
        Object.assign(customQtyInput.style, {
            width: '52px',
            backgroundColor: '#0d1626',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px',
            fontSize: '11px',
            padding: '5px 6px',
            textAlign: 'center',
            display: (cfg.quantityMode === 'CUSTOM' ? 'inline-block' : 'none')
        });

        customQtyInput.onchange = () => {
            const c = loadConfig();
            c.customQuantity = parseInt(customQtyInput.value, 10) || 1;
            saveConfig(c);
            log(`Fixed Quantity set to: ${c.customQuantity}`);
        };

        qtySelect.onchange = () => {
            const c = loadConfig();
            c.quantityMode = qtySelect.value;
            saveConfig(c);
            customQtyInput.style.display = qtySelect.value === 'CUSTOM' ? 'inline-block' : 'none';
            log(`Quantity mode: ${qtySelect.value}`);
        };

        qtyRight.appendChild(qtySelect);
        qtyRight.appendChild(customQtyInput);

        qtyRow.appendChild(qtyLabel);
        qtyRow.appendChild(qtyRight);
        paneProducts.appendChild(qtyRow);

        body.appendChild(paneProducts);

        // --- TAB 2: ACCOUNT & PAYMENT ---
        const paneAuth = document.createElement('div');
        paneAuth.id = 'pane-auth';
        paneAuth.style.display = 'none';
        tabPanes['tab-auth'] = paneAuth;

        function makeField(labelText, inputType, initialValue, onChange, placeholder) {
            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom:10px;';

            const lbl = document.createElement('div');
            Object.assign(lbl.style, {
                fontSize: '10px', fontWeight: '700', color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px'
            });
            lbl.textContent = labelText;

            const input = document.createElement('input');
            input.type = inputType;
            input.value = initialValue || '';
            if (placeholder) input.placeholder = placeholder;
            Object.assign(input.style, {
                width: '100%',
                backgroundColor: '#0d1626',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '12px',
                padding: '8px 12px',
                boxSizing: 'border-box',
                transition: 'border 0.2s'
            });
            input.onchange = () => onChange(input.value);

            row.appendChild(lbl);
            row.appendChild(input);
            return row;
        }

        paneAuth.appendChild(sectionLabel('Login Credentials'));
        paneAuth.appendChild(makeField('Account Email', 'email', cfg.email, v => {
            const c = loadConfig(); c.email = v; saveConfig(c);
        }, 'your@email.com'));

        paneAuth.appendChild(makeField('Account Password', 'password', cfg.password, v => {
            const c = loadConfig(); c.password = v; saveConfig(c);
        }, '••••••••'));

        body.appendChild(paneAuth);

        // --- TAB 3: ENGINE & SETTINGS ---
        const paneSettings = document.createElement('div');
        paneSettings.id = 'pane-settings';
        paneSettings.style.display = 'none';
        tabPanes['tab-settings'] = paneSettings;

        function makeToggle(labelText, sublabel, checked, onChange) {
            const row = document.createElement('label');
            Object.assign(row.style, {
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                marginBottom: '6px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                cursor: 'pointer'
            });

            const left = document.createElement('div');
            const labelEl = document.createElement('div');
            Object.assign(labelEl.style, { fontSize: '12px', color: '#e2e8f0', fontWeight: '600' });
            labelEl.textContent = labelText;
            left.appendChild(labelEl);
            if (sublabel) {
                const sub = document.createElement('div');
                Object.assign(sub.style, { fontSize: '10px', color: '#475569', marginTop: '1px' });
                sub.textContent = sublabel;
                left.appendChild(sub);
            }

            // Custom toggle switch
            const trackEl = document.createElement('div');
            Object.assign(trackEl.style, {
                width: '36px', height: '20px',
                background: checked ? '#2563eb' : '#1e293b',
                borderRadius: '10px',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: '0',
                border: '1px solid rgba(255,255,255,0.08)'
            });
            const thumbEl = document.createElement('div');
            Object.assign(thumbEl.style, {
                position: 'absolute',
                top: '2px', left: checked ? '17px' : '2px',
                width: '14px', height: '14px',
                background: '#ffffff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
            });
            trackEl.appendChild(thumbEl);

            const hiddenCheck = document.createElement('input');
            hiddenCheck.type = 'checkbox';
            hiddenCheck.checked = checked;
            hiddenCheck.style.display = 'none';
            hiddenCheck.onchange = () => {
                trackEl.style.background = hiddenCheck.checked ? '#2563eb' : '#1e293b';
                thumbEl.style.left = hiddenCheck.checked ? '17px' : '2px';
                onChange(hiddenCheck.checked);
            };
            row.onclick = () => { hiddenCheck.checked = !hiddenCheck.checked; hiddenCheck.dispatchEvent(new Event('change')); };

            row.appendChild(left);
            row.appendChild(trackEl);
            row.appendChild(hiddenCheck);
            return row;
        }

        paneSettings.appendChild(sectionLabel('Automation Flags'));
        paneSettings.appendChild(makeToggle('⚡ Turbo Drop Mode', 'Direct API carting & bypass shopping cart page', cfg.turboMode !== false, v => {
            const c = loadConfig(); c.turboMode = v; saveConfig(c);
        }));
        paneSettings.appendChild(makeToggle('Auto-Login', 'Sign in automatically if session expired', cfg.autoLogin, v => {
            const c = loadConfig(); c.autoLogin = v; saveConfig(c);
        }));
        paneSettings.appendChild(makeToggle('Auto Checkout', 'Proceed to checkout after cart is filled', cfg.autoCheckout, v => {
            const c = loadConfig(); c.autoCheckout = v; saveConfig(c);
        }));
        paneSettings.appendChild(makeToggle('Auto Place Order', 'Submit the final order without pausing', cfg.autoPlaceOrder, v => {
            const c = loadConfig(); c.autoPlaceOrder = v; saveConfig(c);
        }));
        paneSettings.appendChild(makeToggle('Repeat Restock Loop', 'Keep buying until items go out of stock', cfg.repeatLoopOOS, v => {
            const c = loadConfig(); c.repeatLoopOOS = v; saveConfig(c);
        }));

        paneSettings.appendChild(sectionLabel('Restock Check Random Delay'));
        const delayRow = document.createElement('div');
        delayRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';

        const minDelayField = makeField('Min Delay (sec)', 'number', cfg.pollMinDelay || 1.5, v => {
            const val = Math.max(parseFloat(v) || 1.0, 0.5);
            const c = loadConfig(); c.pollMinDelay = val; saveConfig(c);
            log(`Monitor Min delay set to ${val}s`);
        }, '1.5');
        minDelayField.style.flex = '1';

        const maxDelayField = makeField('Max Delay (sec)', 'number', cfg.pollMaxDelay || 3.5, v => {
            const val = Math.max(parseFloat(v) || 3.0, 1.0);
            const c = loadConfig(); c.pollMaxDelay = val; saveConfig(c);
            log(`Monitor Max delay set to ${val}s`);
        }, '3.5');
        maxDelayField.style.flex = '1';

        delayRow.appendChild(minDelayField);
        delayRow.appendChild(maxDelayField);
        paneSettings.appendChild(delayRow);

        paneSettings.appendChild(sectionLabel('Notifications'));
        paneSettings.appendChild(makeField('Discord Webhook URL', 'text', cfg.discordWebhook, v => {
            const c = loadConfig(); c.discordWebhook = v; saveConfig(c);
        }, 'https://discord.com/api/webhooks/...'));

        body.appendChild(paneSettings);

        // ── LIVE ACTIVITY LOG (PERMANENTLY VISIBLE BELOW ALL TABS AT BOTTOM) ──
        const logSection = document.createElement('div');
        logSection.id = 'wellbot-log-section';
        logSection.style.cssText = 'margin-top:12px;';

        const logHeader = document.createElement('div');
        logHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
        
        const logTitle = document.createElement('span');
        Object.assign(logTitle.style, {
            fontSize: '10px',
            fontWeight: '700',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.8px'
        });
        logTitle.textContent = 'Live Activity Log';

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        Object.assign(clearBtn.style, {
            fontSize: '10px',
            color: '#64748b',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer'
        });
        clearBtn.onclick = () => { if (consoleBox) consoleBox.innerHTML = ''; };
        logHeader.appendChild(logTitle);
        logHeader.appendChild(clearBtn);
        logSection.appendChild(logHeader);

        consoleBox = document.createElement('div');
        consoleBox.id = 'wellbot-console';
        Object.assign(consoleBox.style, {
            height: '135px',
            overflowY: 'auto',
            backgroundColor: '#020b18',
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace'
        });
        logSection.appendChild(consoleBox);
        body.appendChild(logSection);

        // ── Divider ───────────────────────────────────────────────────────────
        const divider = document.createElement('div');
        Object.assign(divider.style, {
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            margin: '14px 0 12px'
        });
        body.appendChild(divider);

        // ── Control Buttons ───────────────────────────────────────────────────
        const actionRow = document.createElement('div');
        Object.assign(actionRow.style, { display: 'flex', gap: '8px' });

        const startBtn = document.createElement('button');
        startBtn.innerHTML = '&#9654;&nbsp; START BOT';
        Object.assign(startBtn.style, {
            flex: '2',
            padding: '11px 0',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '13px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            letterSpacing: '0.3px',
            boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
            transition: 'all 0.2s ease'
        });

        const loginBtn = document.createElement('button');
        loginBtn.innerHTML = '&#128273;&nbsp; LOGIN';
        Object.assign(loginBtn.style, {
            flex: '1.2',
            padding: '11px 0',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '13px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            letterSpacing: '0.3px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
            transition: 'all 0.2s ease'
        });

        const stopBtn = document.createElement('button');
        stopBtn.innerHTML = '&#9724;&nbsp; STOP';
        Object.assign(stopBtn.style, {
            flex: '1',
            padding: '11px 0',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '13px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            letterSpacing: '0.3px',
            boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
            transition: 'all 0.2s ease'
        });

        startBtn.onclick = () => startBot();
        loginBtn.onclick = async () => {
            const cfg = loadConfig();
            const st = loadState();
            log('Manual Login triggered from HUD...', 'highlight');
            const link = getSignInLink();
            await performLoginFlow(link, cfg, st);
        };
        stopBtn.onclick = () => stopBot();

        actionRow.appendChild(startBtn);
        actionRow.appendChild(loginBtn);
        actionRow.appendChild(stopBtn);
        body.appendChild(actionRow);

        // ── Footer watermark ──────────────────────────────────────────────────
        const footer = document.createElement('div');
        Object.assign(footer.style, {
            textAlign: 'center', fontSize: '9px', color: '#1e293b',
            padding: '8px 0 4px', letterSpacing: '0.5px'
        });
        footer.textContent = 'WellBot CA v2.0 · Auto-Purchase Engine';
        body.appendChild(footer);

        hudRoot.appendChild(body);
        document.body.appendChild(hudRoot);

        // Make HUD Draggable
        makeDraggable(hudRoot, header);
        updateUI();
    }

    function makeDraggable(element, handle) {
        let offsetX = 0, offsetY = 0, initialX = 0, initialY = 0;

        handle.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            initialX = e.clientX;
            initialY = e.clientY;
            document.onmouseup = closeDrag;
            document.onmousemove = dragMove;
        };

        function dragMove(e) {
            e.preventDefault();
            offsetX = initialX - e.clientX;
            offsetY = initialY - e.clientY;
            initialX = e.clientX;
            initialY = e.clientY;
            element.style.top = (element.offsetTop - offsetY) + 'px';
            element.style.left = (element.offsetLeft - offsetX) + 'px';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }

        function closeDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function updateUI() {
        const st = loadState();
        if (st.running) {
            updateStatusBadge(st.phase || 'RUNNING', '#22c55e');
        } else if (st.phase === 'MONITORING') {
            updateStatusBadge('MONITORING', '#f59e0b');
        } else {
            updateStatusBadge('IDLE', '#475569');
        }
    }

    // =========================================================================
    // 5. BOT EXECUTION ENGINE & STATE MACHINE
    // =========================================================================

    /** Locate header sign-in link: <a href="#" class="user-info" id="link_login_form">Sign-In / Register</a> */
    function getSignInLink() {
        // Direct ID selector requested: <a href="#" class="user-info" id="link_login_form">Sign-In / Register</a>
        const direct = document.querySelector('#link_login_form, a.user-info#link_login_form, a[id="link_login_form"]');
        if (direct) return direct;

        // Fallback: search for header links matching "sign-in" or "register"
        const candidates = document.querySelectorAll('a.user-info, header a, .header a, nav a');
        for (const el of candidates) {
            const txt = el.textContent.trim().toLowerCase();
            if (txt.includes('sign-in') || txt.includes('sign in') || txt.includes('register')) {
                return el;
            }
        }
        return null;
    }

    function isUserLoggedIn() {
        // If "Sign-In / Register" link exists in header, user is definitely logged out
        const loginLink = getSignInLink();
        if (loginLink) {
            return false;
        }

        // Detect Well.ca sign in indicator in header
        const signoutLink = document.querySelector('a[href*="main_page=logoff"], a[href*="main_page=account"]');
        const userGreeting = document.querySelector('.header_greeting, .user-name, #my-account-link');
        return !!(signoutLink || (userGreeting && !userGreeting.textContent.toLowerCase().includes('sign in')));
    }

    /**
     * Accurately finds the Well.ca "Sign In" button:
     * <button class="form-control font-size-14" type="button">
     *     <i class="processing-loader fa fa-spinner fa-pulse" style="display: none;"></i>
     *     <span>Sign In</span>
     * </button>
     */
    function findSignInButton(refInput = null) {
        // Priority 1: Search inside the form or login container of email/password input
        if (refInput) {
            const form = refInput.closest('form') || refInput.closest('.login-wrapper, .login_container, #loginDefault, .dropdown-menu, #login_form_container');
            if (form) {
                const formButtons = Array.from(form.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn'));
                for (const btn of formButtons) {
                    const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
                    if (txt.includes('sign in') || txt.includes('login') || txt.includes('log in')) {
                        if (isElementVisible(btn)) return btn;
                    }
                }
            }
        }

        // Priority 2: Look for button.form-control or button[type="button"] containing "Sign In"
        const candidates = Array.from(document.querySelectorAll('button.form-control, button.btn-orange, button[type="button"], button#login_submit, input#login_submit'));
        for (const btn of candidates) {
            const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
            if (txt.includes('sign in') || txt.includes('login') || txt.includes('log in')) {
                if (isElementVisible(btn)) return btn;
            }
        }

        // Priority 3: Any button on page with "Sign In", excluding search form
        const allButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        for (const btn of allButtons) {
            if (btn.classList.contains('search-button') || btn.closest('#search_form')) continue;
            const txt = (btn.textContent || btn.value || '').trim().toLowerCase();
            if (txt.includes('sign in') || txt.includes('log in')) {
                if (isElementVisible(btn)) return btn;
            }
        }

        return findVisibleElement('button.form-control, #login_submit, button#login_submit, button.btn-orange');
    }

    /**
     * Executes login flow. If triggerElement (#link_login_form) is passed, clicks it first,
     * waits for the login dropdown/modal/page to open, then fills credentials and submits.
     */
    async function performLoginFlow(triggerElement = null, cfg = loadConfig(), st = loadState()) {
        if (!cfg.email || !cfg.password) {
            log('❌ Cannot login: Account email or password missing in configuration!', 'error');
            stopBot();
            return false;
        }

        // 1. If #link_login_form was detected, click it first with biometric simulation
        if (triggerElement) {
            log('🔑 Detected "Sign-In / Register" (<a id="link_login_form">). Clicking to open login...', 'highlight');
            await simulateHumanClick(triggerElement);
            await sleep(gaussianRandom(900, 200, 600, 1500));
        }

        log('🔍 Waiting for login input fields...', 'info');

        // 2. Poll up to 6 seconds for login fields (supports inline modal/dropdown or full page)
        let emailInput = null;
        let passInput = null;
        let submitBtn = null;

        for (let attempt = 0; attempt < 20; attempt++) {
            emailInput = findVisibleElement('#email_address, input[name="email_address"], input.sign_in_login_field, .login_email_field, input[type="email"]');
            passInput = findVisibleElement('input.login_password_field, input[name="password"], #password, input[type="password"]');
            submitBtn = findSignInButton(passInput || emailInput);

            if (emailInput && passInput && submitBtn) {
                break;
            }
            await sleep(300);
        }

        // 3. If fields not found after clicking header link, navigate directly to login page
        if (!emailInput || !passInput || !submitBtn) {
            if (!window.location.href.includes('main_page=login')) {
                log('⚠️ Inline login form did not appear after click. Redirecting to login page...', 'warn');
                st.phase = 'LOGIN';
                st.running = true;
                saveState(st);
                window.location.href = 'https://well.ca/index.php?main_page=login';
                return true;
            }
            log('❌ Login input fields could not be found in DOM!', 'error');
            return false;
        }

        // 4. Enter credentials with natural human typing
        log(`✍️ Biometrically typing email: ${cfg.email}`, 'info');
        await simulateHumanType(emailInput, cfg.email);
        await sleep(gaussianRandom(500, 100, 300, 800));

        log('✍️ Biometrically typing password...', 'info');
        await simulateHumanType(passInput, cfg.password);
        await sleep(gaussianRandom(600, 120, 350, 900));

        // 5. Submit form — locate live button to ensure fresh DOM reference
        const liveBtn = findSignInButton(passInput || emailInput) || submitBtn;
        log('🚀 Submitting credentials (clicking Sign In)...', 'highlight');
        st.phase = 'ADDING_PRODUCTS';
        st.currentProductIndex = st.currentProductIndex || 0;
        st.running = true;
        saveState(st);

        // Click the button itself with biometric simulation
        await simulateHumanClick(liveBtn);

        // Also trigger click on the inner <span>Sign In</span> (where click listeners often delegate)
        const innerSpan = liveBtn.querySelector('span');
        if (innerSpan) {
            try {
                innerSpan.click();
            } catch (e) {}
        }

        // Direct native click invocation
        try {
            liveBtn.click();
        } catch (e) {}

        // Fallback form submit if page doesn't unload / response hasn't updated
        const form = liveBtn.closest('form') || (emailInput && emailInput.closest('form'));
        if (form) {
            setTimeout(() => {
                try {
                    if (window.location.href.includes('main_page=login')) {
                        const loader = liveBtn.querySelector('.processing-loader');
                        if (!loader || loader.style.display === 'none') {
                            form.submit();
                        }
                    }
                } catch (e) {}
            }, 1500);
        }

        // 6. Wait briefly to verify login
        for (let wait = 0; wait < 10; wait++) {
            await sleep(500);
            if (isUserLoggedIn()) {
                log('🎉 Logged in successfully to Well.ca!', 'success');
                return true;
            }
        }
        return true;
    }

    async function startBot() {
        isBotActive = true;
        const cfg = loadConfig();
        if (!cfg.productUrls || cfg.productUrls.length === 0) {
            log('No product URLs configured! Please enter at least 1 URL.', 'error');
            return;
        }

        const st = loadState();
        st.running = true;
        st.phase = 'STARTING';
        st.currentProductIndex = 0;
        st.addedProducts = [];
        st.oosProducts = [];
        saveState(st);

        log('🚀 WellBot CA Started!', 'success');
        updateUI();

        // Check if user is currently logged in or needs login
        if (cfg.autoLogin && !isUserLoggedIn()) {
            if (window.location.href.includes('main_page=login')) {
                log('🔐 On login page. Authenticating now...', 'highlight');
                st.phase = 'LOGIN';
                saveState(st);
                const handled = await performLoginFlow(null, cfg, st);
                if (handled) return;
            } else {
                const loginLink = getSignInLink();
                if (loginLink) {
                    log('🔑 Detected "Sign-In / Register" (#link_login_form). Clicking and logging in...', 'highlight');
                    st.phase = 'LOGIN';
                    saveState(st);
                    const handled = await performLoginFlow(loginLink, cfg, st);
                    if (handled) return;
                } else {
                    log('User not logged in. Redirecting to login page...', 'warn');
                    st.phase = 'LOGIN';
                    saveState(st);
                    window.location.href = 'https://well.ca/index.php?main_page=login';
                    return;
                }
            }
        }

        // If already on checkout or cart page, do not navigate away to first product
        if (window.location.href.includes('checkout') || window.location.href.includes('shopping_cart')) {
            log('Starting bot directly on current checkout/cart page...', 'highlight');
            st.phase = window.location.href.includes('checkout') ? 'CHECKOUT' : 'IN_CART';
            saveState(st);
            await processCurrentPage();
            return;
        }

        // Navigate to the first product if not already on a product page
        const firstUrl = cfg.productUrls[0];
        if (window.location.href !== firstUrl) {
            log(`Navigating to first product: ${firstUrl}`, 'highlight');
            st.phase = 'ADDING_PRODUCTS';
            saveState(st);
            window.location.href = firstUrl;
        } else {
            await processCurrentPage();
        }
    }

    function stopBot() {
        isBotActive = false;
        if (typeof _monitorTimer !== 'undefined' && _monitorTimer) {
            clearTimeout(_monitorTimer);
            _monitorTimer = null;
        }
        resetBotState();
        log('🛑 Bot stopped by user.', 'warn');
        updateStatusBadge('STOPPED', '#ef4444');
    }

    // Main Router called on every page load
    async function processCurrentPage() {
        dismissOverlays();
        const cfg = loadConfig();
        const st = loadState();

        const currentUrl = window.location.href;

        // --- ORDER SUCCESS DETECTION ---
        if (currentUrl.includes('checkout_success') || currentUrl.includes('main_page=checkout_success')) {
            log('🎉 Order Success page confirmed!', 'success');
            playBeep('success');
            st.phase = 'ORDER_COMPLETE';
            st.running = false;
            isBotActive = false;
            saveState(st);
            updateUI();
            return;
        }

        // Auto-login trigger if user lands on login page and autoLogin is enabled
        if (currentUrl.includes('main_page=login')) {
            if (cfg.autoLogin && !isUserLoggedIn()) {
                log('🔐 Login page detected. Beginning biometric authentication...', 'highlight');
                st.running = true;
                st.phase = 'LOGIN';
                isBotActive = true;
                saveState(st);
                updateUI();
                await performLoginFlow(null, cfg, st);
                return;
            }
        }

        // Auto-checkout trigger if user lands on checkout page AND bot was started
        if (currentUrl.includes('main_page=checkout_onepage') || currentUrl.includes('/checkout')) {
            if (st.running && isBotActive && (cfg.autoPlaceOrder || cfg.autoCheckout)) {
                log('💳 Checkout OnePage detected. Activating automated Place Order process...', 'highlight');
                st.phase = 'CHECKOUT';
                saveState(st);
                updateUI();
                await handleCheckoutPage(cfg, st);
                return;
            }
        }

        if (!st.running || !isBotActive) {
            log('WellBot CA ready. Press START when you are ready to automate.');
            return;
        }

        // --- ROUTE 0: AUTO-DETECT SIGN-IN / REGISTER LINK (#link_login_form) ---
        if (cfg.autoLogin && !isUserLoggedIn() && !currentUrl.includes('main_page=login')) {
            const loginLink = getSignInLink();
            if (loginLink) {
                log('🔑 Detected "Sign-In / Register" (#link_login_form). Clicking to authenticate...', 'highlight');
                st.phase = 'LOGIN';
                saveState(st);
                await performLoginFlow(loginLink, cfg, st);
                return;
            }
        }

        // --- ROUTE 1: LOGIN PAGE ---
        if (currentUrl.includes('main_page=login')) {
            await handleLoginPage(cfg, st);
            return;
        }

        // --- ROUTE 2: CHECKOUT ONEPAGE ---
        if (currentUrl.includes('main_page=checkout_onepage') || currentUrl.includes('/checkout')) {
            await handleCheckoutPage(cfg, st);
            return;
        }

        // --- ROUTE 3: SHOPPING CART PAGE ---
        if (currentUrl.includes('shopping_cart.html') || currentUrl.includes('main_page=shopping_cart')) {
            await handleCartPage(cfg, st);
            return;
        }

        // --- ROUTE 4: PRODUCT PAGE ---
        if (currentUrl.includes('/products/')) {
            await handleProductPage(cfg, st);
            return;
        }

        // --- ROUTE 5: BACKGROUND MONITORING (parked on homepage or any non-product page) ---
        if (st.phase === 'MONITORING') {
            log('🔍 Resuming Background Fetch Monitor on this page...', 'highlight');
            runBackgroundMonitor(cfg, st);
            return;
        }

        // Default: If on homepage or other page, jump to product flow
        if (st.phase === 'ADDING_PRODUCTS' || st.running) {
            const nextUrl = cfg.productUrls[st.currentProductIndex || 0];
            if (nextUrl && currentUrl !== nextUrl) {
                log(`Navigating to target product: ${nextUrl}`, 'highlight');
                window.location.href = nextUrl;
            }
        }
    }

    // =========================================================================
    // 6. PAGE HANDLER: LOGIN (`index.php?main_page=login`)
    // =========================================================================

    async function handleLoginPage(cfg, st) {
        log('🔐 Login page detected. Beginning biometric authentication...', 'highlight');
        await performLoginFlow(null, cfg, st);
    }

    // =========================================================================
    // 7. PAGE HANDLER: PRODUCT PAGE (`/products/*.html`)
    // =========================================================================

    /**
     * Snapshots the full cart status from the header/dropdown before/after clicking Add to Cart.
     */
    function getCartState() {
        const countEl = document.querySelector('#tablet-cart-item-count, .cart-item-count, #cart_dropdown .count');
        const miniCartTitle = document.querySelector('.mini-cart__title span, .mini-cart__title');
        const products = document.querySelectorAll('.mini-cart__product');
        const emptyBody = document.querySelector('.mini-cart__body--empty');
        const popup = document.querySelector('.cart-popup');

        let count = 0;
        if (countEl) {
            const parsed = parseInt(countEl.textContent.replace(/\D/g, ''), 10);
            if (!isNaN(parsed)) count = parsed;
        } else if (miniCartTitle) {
            const parsed = parseInt(miniCartTitle.textContent.replace(/\D/g, ''), 10);
            if (!isNaN(parsed)) count = parsed;
        }

        return {
            count,
            productCount: products.length,
            hasEmptyBody: !!emptyBody,
            popupVisible: popup ? (popup.style.display !== 'none' && popup.offsetParent !== null) : false,
            cartDropdownHtml: document.querySelector('#cart_dropdown')?.innerHTML || ''
        };
    }

    /**
     * Detects product purchase limit from Well.ca's minmaxInfo element:
     * <div id="minmaxInfo">Max: 2</div>
     */
    function getProductMaxQuantity() {
        // Check exact #minmaxInfo element
        const minmaxEl = document.querySelector('#minmaxInfo, .minmaxInfo, [id*="minmax"]');
        if (minmaxEl) {
            const txt = minmaxEl.textContent || '';
            const match = txt.match(/max:\s*(\d+)/i) || txt.match(/\bmax\b[^\d]*(\d+)/i);
            if (match && match[1]) {
                const maxVal = parseInt(match[1], 10);
                if (!isNaN(maxVal) && maxVal > 0) return maxVal;
            }
        }

        // Check HTML5 input max attribute
        const qtyInput = document.querySelector('#cart_quantity, input.quantity-input, input[name="cart_quantity"]');
        if (qtyInput) {
            const maxAttr = qtyInput.getAttribute('max');
            if (maxAttr && !isNaN(parseInt(maxAttr, 10)) && parseInt(maxAttr, 10) > 0) {
                return parseInt(maxAttr, 10);
            }
        }

        return null;
    }

    /**
     * Rapidly and humanely adjusts product quantity using the + / - buttons on Well.ca:
     * <div class="pro-minus qnt-f"><a class="qnt-a" data-action="-">−</a></div>
     * <input type="number" name="cart_quantity" id="cart_quantity" class="quantity-input nonsubmitable">
     * <div class="pro-plus qnt-f"><a class="qnt-a" data-action="+">+</a></div>
     */
    async function adjustProductQuantity(targetQty) {
        const qtyInput = document.querySelector('#cart_quantity, input[name="cart_quantity"], .quantity-input');
        const plusBtn = document.querySelector('.pro-plus a.qnt-a[data-action="+"], .pro-plus, [aria-label="quantity plus"]');
        const minusBtn = document.querySelector('.pro-minus a.qnt-a[data-action="-"], .pro-minus, [aria-label="quantity minus"]');

        if (!qtyInput) return 1;

        // Automatically cap to product maximum limit if present
        const detectedMax = getProductMaxQuantity();
        if (detectedMax && targetQty > detectedMax) {
            log(`⚠️ Desired quantity (${targetQty}) exceeds limit (Max: ${detectedMax}). Automatically selecting Max: ${detectedMax}!`, 'warn');
            targetQty = detectedMax;
        }

        let currentQty = parseInt(qtyInput.value || '1', 10);
        log(`🎯 Quantity Target: ${targetQty} (Current: ${currentQty}${detectedMax ? `, Max Limit: ${detectedMax}` : ''}). Adjusting via UI buttons...`, 'info');

        // Fast humanized clicking of + or - controls
        if (currentQty < targetQty && plusBtn) {
            const steps = targetQty - currentQty;
            for (let i = 0; i < steps; i++) {
                if (plusBtn.classList.contains('disabled') || plusBtn.getAttribute('aria-disabled') === 'true') {
                    break;
                }
                await simulateHumanClick(plusBtn);
                await sleep(gaussianRandom(75, 18, 45, 120));
                const updatedQty = parseInt(qtyInput.value || `${currentQty + 1}`, 10);
                if (updatedQty === currentQty) {
                    // Reached site's hard limit
                    break;
                }
                currentQty = updatedQty;
                if (currentQty >= targetQty) break;
            }
        } else if (currentQty > targetQty && minusBtn) {
            const steps = currentQty - targetQty;
            for (let i = 0; i < steps; i++) {
                if (minusBtn.classList.contains('disabled') || minusBtn.getAttribute('aria-disabled') === 'true') {
                    break;
                }
                await simulateHumanClick(minusBtn);
                await sleep(gaussianRandom(75, 18, 45, 120));
                const updatedQty = parseInt(qtyInput.value || `${currentQty - 1}`, 10);
                if (updatedQty === currentQty) break;
                currentQty = updatedQty;
                if (currentQty <= targetQty) break;
            }
        }

        // Direct input synchronization to guarantee exact target in form data
        if (parseInt(qtyInput.value || '1', 10) !== targetQty) {
            try {
                const proto = (window.HTMLInputElement || qtyInput.ownerDocument?.defaultView?.HTMLInputElement)?.prototype;
                const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
                if (nativeSetter) {
                    nativeSetter.call(qtyInput, String(targetQty));
                } else {
                    qtyInput.value = String(targetQty);
                }
            } catch (e) {
                qtyInput.value = String(targetQty);
            }
            dispatchSafe(qtyInput, Event, 'input', { bubbles: true, composed: true });
            dispatchSafe(qtyInput, Event, 'change', { bubbles: true });
        }

        const finalQty = parseInt(qtyInput.value || String(targetQty), 10);
        log(`🔢 Quantity confirmed at ${finalQty}`, 'highlight');
        return finalQty;
    }

    async function handleProductPage(cfg, st) {
        const currentUrl = window.location.href;
        log(`Inspecting product page: ${currentUrl}`, 'info');

        await sleep(gaussianRandom(600, 120, 400, 1000));

        // 1. Extract Product Information
        const titleEl = document.querySelector('h1, .product_title, .product-title, [itemprop="name"]');
        const productTitle = titleEl ? titleEl.textContent.trim() : 'Unknown Item';
        const priceEl = document.querySelector('.price, .product-price, .product_price, [itemprop="price"]');
        const productPrice = priceEl ? priceEl.textContent.trim() : 'N/A';

        log(`Target: "${productTitle}" (${productPrice})`, 'highlight');

        // 2. Poll and verify Add to Cart button (determines in-stock status accurately)
        let addToCartBtn = null;
        let isOOS = false;

        for (let poll = 0; poll < 16; poll++) {
            addToCartBtn = document.querySelector(
                '#add_to_cart_button, input#add_to_cart_button, #add_to_cart_button--footer, #btn_add_to_cart, input[name="btn_add_to_cart"], input[value*="Add to Cart"], button[name="add_to_cart"], .add_to_cart_button'
            );

            // If the visible Add to Cart button is present and enabled, the item is definitely IN STOCK
            if (addToCartBtn && isElementVisible(addToCartBtn) && !addToCartBtn.disabled) {
                isOOS = false;
                break;
            }

            // Check if specific OOS notification button is visible in the main product actions area
            const actionArea = document.querySelector('.product-info__actions, .product-info__body__bottom');
            const notifyEl = actionArea ? actionArea.querySelector('#notify_me_button, .product-info__unavailable') : document.querySelector('#notify_me_button');
            if (notifyEl && isElementVisible(notifyEl)) {
                isOOS = true;
                break;
            }

            await sleep(250);
        }

        if (isOOS || !addToCartBtn || !isElementVisible(addToCartBtn) || addToCartBtn.disabled) {
            log(`⚠️ Item is OUT OF STOCK / UNAVAILABLE: "${productTitle}"`, 'warn');
            if (!st.oosProducts.includes(currentUrl)) {
                st.oosProducts.push(currentUrl);
            }

            // Move to next product in target list
            await advanceToNextProduct(cfg, st);
            return;
        }

        log(`✅ Item is IN STOCK: "${productTitle}"! Preparing to add to cart...`, 'success');
        playBeep('alert');

        // 3. Handle Quantity Selection via fast UI +/- buttons (with auto-clamp to #minmaxInfo)
        const detectedMax = getProductMaxQuantity();
        let targetQty = 1;
        if (cfg.quantityMode === 'MAX') {
            targetQty = detectedMax || (cfg.customQuantity || 1);
        } else {
            targetQty = cfg.customQuantity || 1;
        }

        // If target quantity exceeds detected max, automatically select max!
        if (detectedMax && targetQty > detectedMax) {
            log(`ℹ️ Auto-limiting quantity: configured ${targetQty} ➔ Max: ${detectedMax} (#minmaxInfo)`, 'highlight');
            targetQty = detectedMax;
        }

        const selectedQty = await adjustProductQuantity(targetQty);
        await sleep(gaussianRandom(250, 50, 150, 400));

        // 4. Pre-Cart Snapshot before click
        const beforeCart = getCartState();
        log(`🛒 Pre-Cart Snapshot: ${beforeCart.count} item(s) in cart. Clicking "Add to Cart"...`, 'info');

        // Click Add to Cart
        await simulateHumanClick(addToCartBtn);
        try { addToCartBtn.click(); } catch (e) {}

        // Fallback form submission trigger if needed
        const cartForm = addToCartBtn?.closest('form') || document.querySelector('#add_to_cart_form, form[name="cart_quantity"]');
        if (cartForm) {
            setTimeout(() => {
                try {
                    const currentCart = getCartState();
                    if (currentCart.count === beforeCart.count && !currentCart.popupVisible) {
                        cartForm.submit();
                    }
                } catch (e) {}
            }, 1500);
        }

        // 6. DETECT ADD TO CART SUCCESS by monitoring cart state changes
        log('⏳ Monitoring for cart update confirmation...', 'info');
        let addSuccess = false;
        const startTime = Date.now();

        while (Date.now() - startTime < 8000) {
            await sleep(150);
            const afterCart = getCartState();

            // Check 1: Count incremented
            if (afterCart.count > beforeCart.count) {
                log(`🎉 DETECT ADD TO CART SUCCESS! Cart count: ${beforeCart.count} ➔ ${afterCart.count}`, 'success');
                addSuccess = true;
                break;
            }

            // Check 2: More items in mini-cart table
            if (afterCart.productCount > beforeCart.productCount) {
                log(`🎉 DETECT ADD TO CART SUCCESS! Product added to mini-cart table (${afterCart.productCount} item(s))`, 'success');
                addSuccess = true;
                break;
            }

            // Check 3: Mini-cart empty status removed
            if (beforeCart.hasEmptyBody && !afterCart.hasEmptyBody) {
                log('🎉 DETECT ADD TO CART SUCCESS! Mini-cart status changed from empty!', 'success');
                addSuccess = true;
                break;
            }

            // Check 4: Popup visible with confirmation
            const popup = document.querySelector('.cart-popup');
            if (popup && (popup.style.display !== 'none' || popup.textContent.includes('was added to your cart') || popup.textContent.includes('Item added to cart'))) {
                log('🎉 DETECT ADD TO CART SUCCESS! "Item added to cart" popup confirmed!', 'success');
                addSuccess = true;
                break;
            }

            // Check 5: Dropdown HTML changed
            if (afterCart.cartDropdownHtml && beforeCart.cartDropdownHtml && afterCart.cartDropdownHtml !== beforeCart.cartDropdownHtml) {
                log('🎉 DETECT ADD TO CART SUCCESS! Cart dropdown updated in DOM!', 'success');
                addSuccess = true;
                break;
            }
        }

        if (!addSuccess) {
            log('⚠️ Instant cart update not detected, verifying page state...', 'warn');
        }

        playBeep('alert');

        st.addedProducts.push({
            url: currentUrl,
            title: productTitle,
            price: productPrice,
            quantity: selectedQty,
            timestamp: new Date().toLocaleTimeString()
        });
        saveState(st);

        await sleep(gaussianRandom(600, 150, 400, 1000));

        // Advance to next product in queue or proceed to cart
        await advanceToNextProduct(cfg, st);
    }

    async function advanceToNextProduct(cfg, st) {
        st.currentProductIndex = (st.currentProductIndex || 0) + 1;

        // Check if we still have more products in the queue to add
        if (st.currentProductIndex < cfg.productUrls.length) {
            const nextUrl = cfg.productUrls[st.currentProductIndex];
            log(`Moving to product #${st.currentProductIndex + 1}/${cfg.productUrls.length}: ${nextUrl}`, 'highlight');
            saveState(st);
            await sleep(gaussianRandom(600, 150, 400, 1000));
            window.location.href = nextUrl;
        } else {
            // Queue finished: check if anything was actually added
            if (st.addedProducts && st.addedProducts.length > 0) {
                if (cfg.turboMode !== false) {
                    log('⚡ Turbo Drop Mode: Skipping shopping cart page, jumping directly to Checkout OnePage!', 'highlight');
                    st.phase = 'CHECKOUT';
                    saveState(st);
                    window.location.href = 'https://well.ca/index.php?main_page=checkout_onepage';
                    return;
                }
                log('🎉 Target products added to cart! Navigating to Cart...', 'success');
                st.phase = 'IN_CART';
                saveState(st);
                await sleep(gaussianRandom(800, 200, 500, 1300));
                window.location.href = 'https://well.ca/shopping_cart.html';
            } else {
                // Nothing was added (all targets OOS)
                log('⚠️ All target products are currently Out of Stock.', 'warn');
                if (cfg.repeatLoopOOS) {
                    log(`🔄 Restock Monitor: Waiting ${(cfg.pollIntervalMs || 2500) / 1000}s to re-check targets...`, 'highlight');
                    st.phase = 'MONITORING';
                    st.currentProductIndex = 0;
                    saveState(st);
                    runBackgroundMonitor(cfg, st);
                } else {
                    stopBot();
                }
            }
        }
    }

    // =========================================================================
    // 8. PAGE HANDLER: CART (`shopping_cart.html`)
    // =========================================================================

    async function handleCartPage(cfg, st) {
        log('🛒 Inside Shopping Cart. Verifying items...', 'highlight');
        await sleep(gaussianRandom(1000, 200, 700, 1500));

        // Check if cart is empty
        const emptyIndicator = document.body.innerText.toLowerCase().includes('your shopping cart is empty');
        if (emptyIndicator) {
            log('⚠️ Shopping cart is currently empty — all targets are OOS.', 'warn');

            if (cfg.repeatLoopOOS) {
                log('🔍 Switching to BACKGROUND FETCH Monitor (no page reloads)...', 'highlight');
                st.phase = 'MONITORING';
                st.oosProducts = [...cfg.productUrls];
                saveState(st);
                // Navigate to Well.ca homepage as a neutral "parked" page,
                // then the background monitor takes over without any more navigations
                if (!window.location.href.includes('well.ca/index.php') &&
                    !window.location.href.endsWith('well.ca/') &&
                    !window.location.href.endsWith('well.ca')) {
                    window.location.href = 'https://well.ca/';
                } else {
                    runBackgroundMonitor(cfg, st);
                }
            } else {
                stopBot();
            }
            return;
        }

        // Locate Proceed to Checkout button
        const checkoutSelectors = [
            'a[href*="checkout_onepage"]',
            'a.checkout_button',
            'button[name="checkout"]',
            '#btn_checkout',
            'a[href*="checkout"]',
            'input[value*="Checkout"]',
            'button:has-text("Checkout")'
        ];

        let checkoutBtn = null;
        for (const selector of checkoutSelectors) {
            checkoutBtn = document.querySelector(selector);
            if (checkoutBtn && checkoutBtn.offsetParent !== null) break;
        }

        if (!checkoutBtn) {
            // Fallback search by text
            checkoutBtn = Array.from(document.querySelectorAll('a, button, input[type="submit"]'))
                .find(el => el.textContent.toLowerCase().includes('checkout') || (el.value && el.value.toLowerCase().includes('checkout')));
        }

        if (checkoutBtn) {
            log('Found "Proceed to Checkout" button. Clicking...', 'success');
            st.phase = 'CHECKOUT';
            saveState(st);
            await sleep(gaussianRandom(500, 100, 300, 800));
            await simulateHumanClick(checkoutBtn);
        } else {
            log('Could not locate checkout button. Attempting direct navigation to checkout_onepage...', 'warn');
            st.phase = 'CHECKOUT';
            saveState(st);
            window.location.href = 'https://well.ca/index.php?main_page=checkout_onepage';
        }
    }

    // =========================================================================
    // 9. PAGE HANDLER: CHECKOUT ONEPAGE (`index.php?main_page=checkout_onepage`)
    // =========================================================================

    async function handleCheckoutPage(cfg, st) {
        log('💳 Checkout OnePage active! Proceeding through review & payment...', 'highlight');
        await sleep(gaussianRandom(1200, 250, 800, 1800));

        // 1. Select Standard Shipping if prompted
        const shippingRadios = document.querySelectorAll('input[type="radio"][name="shipping"]');
        if (shippingRadios.length > 0) {
            const unChecked = Array.from(shippingRadios).find(r => r.checked);
            if (!unChecked && shippingRadios[0]) {
                log('Selecting default shipping option...');
                await simulateHumanClick(shippingRadios[0]);
                await sleep(500);
            }
        }

        // 2. Handle Payment Method Selection & Details
        if (cfg.cardNumber) {
            log('Auto-filling payment details...');

            // Credit Card Number
            const cardNumInput = document.querySelector('#creditcard_number, #cc_number, input[name="cc_number"], #cardNumber');
            if (cardNumInput && !cardNumInput.value) {
                await simulateHumanType(cardNumInput, cfg.cardNumber.replace(/\s+/g, ''));
                await sleep(300);
            }

            // Expiry Month
            const expMonthInput = document.querySelector('#creditcard_expires_month, #cc_expires_month, select[name="cc_expires_month"], input[name="cc_expires_month"]');
            if (expMonthInput && cfg.cardExpiryMonth) {
                if (expMonthInput.tagName.toLowerCase() === 'select') {
                    await simulateHumanSelect(expMonthInput, cfg.cardExpiryMonth);
                } else {
                    await simulateHumanType(expMonthInput, cfg.cardExpiryMonth);
                }
                await sleep(250);
            }

            // Expiry Year
            const expYearInput = document.querySelector('#creditcard_expires_year, #cc_expires_year, select[name="cc_expires_year"], input[name="cc_expires_year"]');
            if (expYearInput && cfg.cardExpiryYear) {
                if (expYearInput.tagName.toLowerCase() === 'select') {
                    await simulateHumanSelect(expYearInput, cfg.cardExpiryYear);
                } else {
                    await simulateHumanType(expYearInput, cfg.cardExpiryYear);
                }
                await sleep(250);
            }

            // CVV
            const cvvInput = document.querySelector('#creditcard_cvv, #cc_cvv, input[name="cc_cvv"], #cvv');
            if (cvvInput && cfg.cardCvv && !cvvInput.value) {
                await simulateHumanType(cvvInput, cfg.cardCvv);
                await sleep(300);
            }
        }

        // 3. Agree to Terms / Conditions Checkbox (if required)
        const termsCheckbox = document.querySelector('#conditions, input[name="terms"], input[name="conditions"], input[type="checkbox"][id*="terms"]');
        if (termsCheckbox && !termsCheckbox.checked) {
            log('Accepting terms & conditions...');
            await simulateHumanClick(termsCheckbox);
            await sleep(300);
        }

    /**
     * Locates the Place Order button on well.ca one-page checkout.
     * Targeted element:
     * <div id="checkoutButtonWrapper">
     *     <div id="checkoutButton">
     *         <button onclick="submitFunction(0.00, 99.708); return false;" id="confirm_purchase" type="submit" value="Continue" class="btn btn-checkout pleaseWait confirm_purchase">Place Order</button>
     */
    function findPlaceOrderButton() {
        const primarySelectors = [
            '#checkoutButtonWrapper #confirm_purchase',
            '#checkoutButton #confirm_purchase',
            'button#confirm_purchase',
            '#confirm_purchase',
            '#checkoutButton button.confirm_purchase',
            '#checkoutButtonWrapper button',
            'button.btn-checkout.confirm_purchase',
            'button.confirm_purchase',
            '#btn_place_order',
            '#checkout_submit',
            'input[value*="Place Order"]',
            'input[value*="Submit Order"]',
            'button[type="submit"][name="btn_place_order"]',
            '.btn-place-order'
        ];

        for (const selector of primarySelectors) {
            const btn = document.querySelector(selector);
            if (btn && (btn.offsetParent !== null || btn.offsetWidth > 0 || btn.offsetHeight > 0)) {
                return btn;
            }
        }

        // Fallback: search all buttons or inputs
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
        return buttons.find(b => {
            const text = (b.textContent || b.value || '').trim().toLowerCase();
            return (text.includes('place order') || text.includes('submit order') || text.includes('confirm purchase') || text.includes('confirm order')) &&
                   !text.includes('paypal') && !text.includes('klarna');
        }) || null;
    }

    /**
     * Detects whether the order has successfully finished submitting.
     */
    function isOrderSuccess() {
        const url = window.location.href.toLowerCase();
        if (url.includes('checkout_success') || url.includes('main_page=checkout_success') || url.includes('/order/confirmation') || url.includes('/checkout/success')) {
            return true;
        }

        const successSelectors = [
            '.checkout-success',
            '#checkoutSuccess',
            '#order-confirmation',
            '.order-confirmation',
            '.thank-you-page',
            '#checkout_success'
        ];
        for (const sel of successSelectors) {
            if (document.querySelector(sel)) return true;
        }

        const bodyText = (document.body ? document.body.innerText || document.body.textContent || '' : '').toLowerCase();
        const successKeywords = [
            'thank you for your order',
            'your order has been placed',
            'your order has been confirmed',
            'your order has been received',
            'order confirmation #',
            'order number:'
        ];
        return successKeywords.some(kw => bodyText.includes(kw));
    }

        // 4. Place Order Submission Loop: Repeat clicking #confirm_purchase with random delays until success
        if (!cfg.autoPlaceOrder) {
            log('Auto-Place Order is OFF in settings. Please review and click Place Order manually.', 'warn');
            return;
        }

        log('🚨 AUTO PLACE ORDER ACTIVE: Preparing to click Place Order (#confirm_purchase)...', 'highlight');

        const startTime = Date.now();
        const maxDurationMs = 180000; // 3 minutes timeout safety
        let attempt = 0;

        while (Date.now() - startTime < maxDurationMs) {
            // Immediate abort check when user clicks STOP
            if (isExecutionStopped()) {
                log('🛑 Auto-Place Order aborted: Bot stopped by user.', 'warn');
                return;
            }

            // Check if order already succeeded (URL or page message)
            if (isOrderSuccess()) {
                log('🎉 ORDER SUCCESS CONFIRMED! Order has been placed successfully on Well.ca!', 'success');
                playBeep('success');

                // Send notification
                sendWebhookNotification(
                    'ORDER PLACED SUCCESSFULLY!',
                    `Auto-purchase completed for ${st.addedProducts.length} items on Well.ca! Order confirmed after ${attempt} attempt(s).`,
                    st.addedProducts.map((p, idx) => ({ name: `Item #${idx + 1}`, value: `${p.title} (Qty: ${p.quantity})` }))
                );

                st.cycleCount = (st.cycleCount || 0) + 1;
                st.phase = 'ORDER_COMPLETE';
                st.running = false;
                isBotActive = false;
                saveState(st);
                updateUI();

                // Repeat cycle if requested
                if (cfg.repeatLoopOOS) {
                    log('Waiting 15s before starting next cycle...', 'highlight');
                    await sleep(15000);
                    if (isExecutionStopped()) return;
                    st.currentProductIndex = 0;
                    st.addedProducts = [];
                    st.phase = 'ADDING_PRODUCTS';
                    st.running = true;
                    isBotActive = true;
                    saveState(st);
                    window.location.href = cfg.productUrls[0];
                } else {
                    stopBot();
                }
                return;
            }

            // Verify we haven't navigated to an unrelated page
            const currentUrl = window.location.href.toLowerCase();
            if (!currentUrl.includes('checkout_onepage') && !currentUrl.includes('/checkout')) {
                log(`Navigated away from checkout page: ${window.location.href}`);
                return;
            }

            attempt++;
            const placeOrderBtn = findPlaceOrderButton();

            if (!placeOrderBtn) {
                log(`[Attempt ${attempt}] "Place Order" button not found yet. Retrying in a moment...`, 'warn');
                await sleep(gaussianRandom(1000, 250, 700, 1600));
                continue;
            }

            // Check if button is disabled (server actively processing order submission)
            const isButtonDisabled = placeOrderBtn.disabled || 
                                     placeOrderBtn.getAttribute('aria-disabled') === 'true' ||
                                     placeOrderBtn.classList.contains('disabled');

            if (isButtonDisabled) {
                log(`[Attempt ${attempt}] Place Order button is currently disabled/submitting. Waiting for server response...`);
                await sleep(gaussianRandom(1200, 300, 800, 1800));
                continue;
            }

            // Humanized random delay before clicking
            const clickDelay = gaussianRandom(800, 250, 450, 1500);
            log(`[Attempt ${attempt}] Clicking "Place Order" (#confirm_purchase) after random delay of ${Math.round(clickDelay)}ms...`, 'highlight');
            await sleep(clickDelay);

            if (isExecutionStopped()) {
                log('🛑 Auto-Place Order aborted: Bot stopped by user.', 'warn');
                return;
            }

            // Re-verify success right after delay
            if (isOrderSuccess()) continue;

            // Execute biometric human click + native events
            try {
                placeOrderBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await sleep(100);

                await simulateHumanClick(placeOrderBtn);

                if (typeof placeOrderBtn.click === 'function') {
                    try { placeOrderBtn.click(); } catch (e) {}
                }

                // If button has inline onclick or submitFunction, trigger as safety backup
                const onclickAttr = placeOrderBtn.getAttribute('onclick');
                if (onclickAttr && typeof window.submitFunction === 'function') {
                    try {
                        window.eval(onclickAttr);
                    } catch (e) {
                        try { window.submitFunction(0.00, 99.708); } catch (err) {}
                    }
                }
            } catch (err) {
                log(`Error clicking Place Order button: ${err.message}`, 'error');
            }

            // Random delay after clicking to let AJAX / redirect complete
            const postDelay = gaussianRandom(1800, 400, 1200, 2800);
            await sleep(postDelay);

            if (isExecutionStopped()) {
                log('🛑 Auto-Place Order aborted: Bot stopped by user.', 'warn');
                return;
            }
        }

        log('⚠️ Auto-Place Order timed out after 3 minutes. Please check the checkout page manually.', 'error');
    }

    // =========================================================================
    // 10. BACKGROUND FETCH STOCK MONITOR (No page reloads needed)
    // =========================================================================

    /**
     * Turbo Drop Engine: Direct background carting via Well.ca's ZenCart endpoint.
     * Bypasses client-side DOM rendering completely to cart within ~80ms.
     */
    function directApiAddToCart(productId, qty = 1, securityToken = null) {
        return new Promise((resolve) => {
            const params = new URLSearchParams();
            params.append('products_id', String(productId));
            params.append('cart_quantity', String(qty));
            if (securityToken) {
                params.append('securityToken', securityToken);
            }

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://well.ca/index.php?main_page=product_info&action=add_product',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
                    'Cache-Control': 'no-cache, no-store'
                },
                data: params.toString(),
                timeout: 8000,
                onload: function(response) {
                    const isSuccess = response.status >= 200 && response.status < 400;
                    resolve({
                        success: isSuccess,
                        status: response.status,
                        finalUrl: response.finalUrl || ''
                    });
                },
                onerror: function(err) {
                    resolve({ success: false, reason: 'network_error' });
                },
                ontimeout: function() {
                    resolve({ success: false, reason: 'timeout' });
                }
            });
        });
    }

    /**
     * Silently fetches a product page via GM_xmlhttpRequest with Edge Cache-Busting
     * and extracts security token, product ID, and stock status.
     * Returns a Promise<{ inStock: boolean, reason: string, productId, securityToken, maxQty }>
     */
    function fetchCheckStock(url) {
        return new Promise((resolve) => {
            // Anti-CDN Edge Cache Buster timestamp
            const cacheBuster = `_ts=${Date.now()}`;
            const targetUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: targetUrl,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                timeout: 12000,
                onload: function(response) {
                    try {
                        const html = response.responseText || '';

                        // Extract parameters for Turbo Carting
                        const tokenMatch = html.match(/name=["']securityToken["'][^>]*value=["']([^"']+)["']/i);
                        const securityToken = tokenMatch ? tokenMatch[1] : null;

                        const maxMatch = html.match(/id=["']minmaxInfo["'][^>]*>\s*Max:\s*(\d+)/i);
                        const maxQty = maxMatch ? parseInt(maxMatch[1], 10) : null;

                        const idMatch = url.match(/_(\d+)\.html/);
                        const productId = idMatch ? idMatch[1] : null;

                        // ── Out-of-Stock signal 1: Discontinued label ─────────────────────────
                        if (/product-info__unavailable--discontinued/i.test(html)) {
                            return resolve({ inStock: false, reason: 'discontinued', productId });
                        }

                        // ── Out-of-Stock signal 2: Notify Me / Sold Out button ────────────────
                        if (/id=["']notify_me_button["']/i.test(html)) {
                            return resolve({ inStock: false, reason: 'notify_me_sold_out', productId });
                        }

                        // ── Out-of-Stock signal 3: Add to Cart form hidden (d-none) ───────────
                        if (/id=["']add_to_cart_form["'][^>]*class=["'][^"']*d-none/i.test(html) ||
                            /class=["'][^"']*d-none[^"']*["'][^>]*id=["']add_to_cart_form["']/i.test(html)) {
                            return resolve({ inStock: false, reason: 'form_hidden', productId });
                        }

                        // ── Out-of-Stock signal 4: Text phrase indicators ─────────────────────
                        const lowerHtml = html.toLowerCase();
                        const oosTextSignals = [
                            'no longer available',
                            'sold out',
                            'notify me',
                            'out of stock',
                            'currently unavailable',
                            'product-info__actions--unavailable'
                        ];
                        for (const signal of oosTextSignals) {
                            if (lowerHtml.includes(signal)) {
                                return resolve({ inStock: false, reason: signal, productId });
                            }
                        }

                        // ── In-Stock signal: Add to Cart button present and form visible ──────
                        const hasCartForm = /id=["']add_to_cart_form["']/i.test(html);
                        const hasAddBtn = (/id=["']add_to_cart_button["']/i.test(html)) ||
                                         (/id=["']btn_add_to_cart["']/i.test(html)) ||
                                         (/name=["']btn_add_to_cart["']/i.test(html)) ||
                                         (/value=["']Add to Cart["']/i.test(html));

                        if (hasCartForm && hasAddBtn) {
                            return resolve({
                                inStock: true,
                                reason: 'add_to_cart_visible',
                                productId,
                                securityToken,
                                maxQty
                            });
                        }

                        return resolve({ inStock: false, reason: 'inconclusive', productId });

                    } catch (err) {
                        return resolve({ inStock: false, reason: 'parse_error: ' + err.message });
                    }
                },
                onerror: function(err) {
                    resolve({ inStock: false, reason: 'network_error' });
                },
                ontimeout: function() {
                    resolve({ inStock: false, reason: 'timeout' });
                }
            });
        });
    }

    /**
     * Background monitoring loop:
     * - Stays on the current page (no navigation)
     * - Polls using silent GM_xmlhttpRequest fetches with Edge cache-busters
     * - When any target URL goes IN STOCK, triggers Turbo Direct API Carting & instant checkout jump
     * - Tracks per-URL OOS reasons in state
     */
    let _monitorTimer = null;

    /**
     * Calculates a randomized delay in milliseconds between the UI configured Min and Max delays.
     */
    function getRandomPollInterval(config) {
        const min = Math.max(parseFloat(config.pollMinDelay) || 1.5, 0.5);
        const max = Math.max(parseFloat(config.pollMaxDelay) || 3.5, min);
        const randomSec = min + Math.random() * (max - min);
        return Math.round(randomSec * 1000);
    }

    async function runBackgroundMonitor(cfg, st) {
        const liveCfg = loadConfig();
        const minSec = liveCfg.pollMinDelay || 1.5;
        const maxSec = liveCfg.pollMaxDelay || 3.5;
        const urls = liveCfg.productUrls.filter(u => u && u.trim());

        if (!urls.length) {
            log('No product URLs configured for monitoring!', 'error');
            return;
        }

        log(`🔍 Background Monitor ACTIVE — checking ${urls.length} URL(s) with random delay (${minSec}s – ${maxSec}s)`, 'highlight');
        updateStatusBadge('MONITORING', '#f59e0b');

        async function pollCycle() {
            const currentState = loadState();
            if (!currentState.running || currentState.phase !== 'MONITORING') {
                log('Monitor stopped (state changed).', 'info');
                return;
            }

            const currentCfg = loadConfig();

            for (let i = 0; i < urls.length; i++) {
                if (isExecutionStopped()) return;

                const url = urls[i];
                const productSlug = url.split('/products/')[1] || url;
                log(`📡 [${i + 1}/${urls.length}] Checking: ${productSlug}`, 'info');

                const result = await fetchCheckStock(url);
                if (isExecutionStopped()) return;

                if (result.inStock) {
                    log(`🚨 IN STOCK DETECTED: ${productSlug}`, 'success');
                    playBeep('success');
                    sendWebhookNotification(
                        '🔔 RESTOCK DETECTED!',
                        `Item is NOW IN STOCK on Well.ca!\n${url}`,
                        [{ name: 'URL', value: url }]
                    );

                    // TURBO DROP ENGINE: Direct background API carting & instant checkout jump
                    if (currentCfg.turboMode !== false && result.productId) {
                        let targetQty = 1;
                        if (currentCfg.quantityMode === 'MAX' && result.maxQty) {
                            targetQty = result.maxQty;
                        } else {
                            targetQty = currentCfg.customQuantity || 1;
                        }

                        log(`⚡ TURBO MODE: Instantly carting Product ID #${result.productId} (Qty: ${targetQty}) via background API...`, 'highlight');
                        const cartResult = await directApiAddToCart(result.productId, targetQty, result.securityToken);

                        if (cartResult.success) {
                            log(`🎉 TURBO CART SUCCESS! Bypassing cart page, jumping directly to Checkout OnePage!`, 'success');
                            currentState.phase = 'CHECKOUT';
                            currentState.addedProducts = [{
                                url: url,
                                title: productSlug,
                                quantity: targetQty,
                                timestamp: new Date().toISOString()
                            }];
                            saveState(currentState);
                            window.location.href = 'https://well.ca/index.php?main_page=checkout_onepage';
                            return;
                        } else {
                            log(`Turbo direct carting fallback (Status: ${cartResult.status}). Loading product page...`, 'warn');
                        }
                    }

                    // Standard fallback: navigate to product page
                    currentState.phase = 'ADDING_PRODUCTS';
                    currentState.currentProductIndex = i;
                    currentState.oosProducts = currentState.oosProducts.filter(u => u !== url);
                    saveState(currentState);

                    clearTimeout(_monitorTimer);
                    window.location.href = url;
                    return; // Stop polling; page navigation handles next steps
                } else {
                    log(`💤 Still OOS (${result.reason}): ${productSlug}`, 'warn');
                    if (!currentState.oosProducts.includes(url)) {
                        currentState.oosProducts.push(url);
                        saveState(currentState);
                    }
                }

                // Small inter-request gap to avoid hammering server
                await sleep(500);
            }

            // Schedule next poll cycle with random delay from UI configuration
            const latestCfg = loadConfig();
            const dynamicInterval = getRandomPollInterval(latestCfg);
            log(`⏱ Next check in ${(dynamicInterval / 1000).toFixed(2)}s`, 'info');
            _monitorTimer = setTimeout(pollCycle, dynamicInterval);
        }

        // Kick off immediately
        await pollCycle();
    }

    /** Legacy alias — kept for compatibility if called elsewhere */
    function scheduleRestockPoll(cfg, st) {
        runBackgroundMonitor(cfg, st);
    }

    /** Update the HUD status badge with custom color */
    function updateStatusBadge(text, color) {
        if (statusBadge) {
            statusBadge.textContent = text;
            statusBadge.style.backgroundColor = color || '#475569';
        }
    }

    // =========================================================================
    // 11. INITIALIZATION ON PAGE READY & SESSION HEARTBEAT
    // =========================================================================

    let _heartbeatTimer = null;
    function startSessionHeartbeat() {
        if (_heartbeatTimer) clearInterval(_heartbeatTimer);
        _heartbeatTimer = setInterval(() => {
            if (isUserLoggedIn()) {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://well.ca/index.php?main_page=account',
                    headers: { 'Cache-Control': 'no-cache' },
                    timeout: 8000,
                    onload: () => {}
                });
            }
        }, 180000); // 3 minutes
    }

    function init() {
        const st = loadState();
        isBotActive = Boolean(st && st.running);
        startSessionHeartbeat();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createHUD();
                processCurrentPage();
            });
        } else {
            createHUD();
            processCurrentPage();
        }
    }

    init();

})();
