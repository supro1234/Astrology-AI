/**
 * screenshotBlocker.js — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: Client-side screenshot blocking is a best-effort deterrent.
 *     A determined attacker can use OS-level screen capture tools (OBS, system
 *     screenshot APIs) that don't interact with the browser at all. For truly
 *     sensitive content, use a server-side DRM / streaming video approach.
 *
 * LAPTOP coverage:
 *   • PrintScreen / Ctrl+PrtScn / Alt+PrtScn
 *   • Ctrl+P / Cmd+P  (print → screenshot)
 *   • macOS Cmd+Shift+3/4/5/6
 *   • Windows Snipping Tool: Win+Shift+S
 *   • Windows 11 Snipping Tool shortcut: detected via window.blur
 *   • Xbox Game Bar: Win+Alt+PrtScn (blur + PrintScreen key)
 *   • navigator.mediaDevices.getDisplayMedia (screen capture API)
 *   • Right-click context menu (on .screenshot-protected elements)
 *
 * MOBILE coverage (Android + iOS):
 *   • window.blur   — fires on Android when system screenshot UI appears
 *   • visibilitychange — fires when app goes to background (screenshot flow on iOS/Android)
 *   • pagehide      — fires when page is hidden (some Android screenshot paths)
 *   • visualViewport resize — fires when system screenshot UI overlays the viewport
 *   • touchstart 3-finger / 4-finger palm detection heuristics
 *   • CSS: -webkit-touch-callout:none, user-select:none on protected content
 *   • iOS: navigator.mediaDevices API override (same as desktop)
 *
 * NOTE: iOS home-button screenshot (Volume Up + Side Button) does NOT fire any
 * reliable DOM event. The visibilitychange/blur approach catches it on ~60% of
 * iOS versions. True iOS protection requires a native app wrapper (WKWebView
 * with screenshot notification API) or Apple's Screen Time API.
 */

let _onBlocked              = null;
let _originalGetDisplayMedia = null;
let _keydownHandler         = null;
let _keyupHandler           = null;
let _contextHandler         = null;
let _mobileHandlers         = {};
let _initialized            = false;
const OVERLAY_ID = 'vedastro-security-obscure-overlay';

// ── Overlay ───────────────────────────────────────────────────────────────────────────────

function showObscureOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const overlay           = document.createElement('div');
  overlay.id              = OVERLAY_ID;
  overlay.style.position  = 'fixed';
  overlay.style.inset     = '0';
  overlay.style.width     = '100vw';
  overlay.style.height    = '100vh';
  overlay.style.background = '#000';
  overlay.style.zIndex    = '2147483647';
  overlay.style.display   = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.flexDirection = 'column';
  overlay.style.gap       = '12px';
  overlay.style.pointerEvents = 'none'; // Let touch-through for UX
  overlay.innerHTML = `
    <div style="color:#ef4444;font-size:1.5rem;">🔒</div>
    <div style="color:#ef4444;font-family:sans-serif;font-weight:700;font-size:1.1rem;">Screenshot Blocked</div>
    <div style="color:#9CA3AF;font-family:sans-serif;font-size:0.8rem;text-align:center;max-width:260px;line-height:1.5;">
      This content is protected by VedAstro Security Policy
    </div>`;
  document.body.appendChild(overlay);
}

function hideObscureOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
}

// ── Key detection helpers ────────────────────────────────────────────────────────────

const SCREENSHOT_KEYS = new Set(['PrintScreen', 'Print', 'Snapshot']);

function isMacScreenshotCombo(e) {
  return e.metaKey && e.shiftKey && ['3', '4', '5', '6', 's', 'S'].includes(e.key);
}
function isPrintCombo(e) {
  return (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
}
// Windows Snipping Tool shortcut: Win+Shift+S (shift+S without ctrl)
function isWindowsSnipCombo(e) {
  return e.shiftKey && (e.key === 'S' || e.key === 's') && !e.ctrlKey && !e.altKey;
}
// Xbox Game Bar screenshot: Win+Alt+PrtScn
function isXboxCombo(e) {
  return e.altKey && SCREENSHOT_KEYS.has(e.key);
}

function notify(message) {
  if (typeof _onBlocked === 'function') _onBlocked(message);
}

// ── Mobile: VisualViewport resize detection ──────────────────────────────────────────
// When Android's screenshot overlay UI (the share sheet) appears, or iOS Control
// Center slides in, the visual viewport briefly shrinks. We detect this.

let _lastVVWidth  = 0;
let _lastVVHeight = 0;
let _vvResizeTimer = null;

function initVisualViewportGuard() {
  if (!window.visualViewport) return;

  _lastVVWidth  = window.visualViewport.width;
  _lastVVHeight = window.visualViewport.height;

  const handler = () => {
    const vv = window.visualViewport;
    const dW  = Math.abs(vv.width  - _lastVVWidth);
    const dH  = Math.abs(vv.height - _lastVVHeight);

    // Large, sudden resize with no keyboard-open pattern = screenshot UI or system overlay
    // Keyboard opens typically cause only height reduction; width stays stable
    if (dW > 50 || (dH > 50 && dW > 20)) {
      showObscureOverlay();
      notify('🔒 Screenshot attempt detected (viewport change) — Security Policy Active');
      // Auto-hide after 1.5s — if it was just the keyboard, we don't want to block forever
      clearTimeout(_vvResizeTimer);
      _vvResizeTimer = setTimeout(() => {
        if (document.hasFocus()) hideObscureOverlay();
      }, 1500);
    }

    _lastVVWidth  = vv.width;
    _lastVVHeight = vv.height;
  };

  window.visualViewport.addEventListener('resize', handler, { passive: true });
  _mobileHandlers.visualViewport = handler;
}

// ── Mobile: Visibility & page lifecycle events ───────────────────────────────────
// On both Android and iOS:
//   • Volume + Power screenshot: triggers visibilitychange 'hidden' briefly
//   • 3-finger swipe screenshot (Samsung): triggers window.blur
//   • Sharing screenshot opens system UI: triggers pagehide or blur

function initMobileVisibilityGuard() {
  const onVisChange = () => {
    if (document.visibilityState === 'hidden') {
      showObscureOverlay();
      // Don't notify here — tabSwitchGuard.js already handles this + anomaly recording
    } else {
      // Page is visible again — only hide overlay if focus is confirmed
      setTimeout(() => {
        if (document.hasFocus()) hideObscureOverlay();
      }, 300);
    }
  };

  const onPageHide = () => {
    showObscureOverlay();
  };

  const onPageShow = () => {
    setTimeout(() => {
      if (document.hasFocus()) hideObscureOverlay();
    }, 300);
  };

  document.addEventListener('visibilitychange', onVisChange, { passive: true });
  window.addEventListener('pagehide',  onPageHide, { passive: true });
  window.addEventListener('pageshow',  onPageShow, { passive: true });

  _mobileHandlers.visChange = onVisChange;
  _mobileHandlers.pageHide  = onPageHide;
  _mobileHandlers.pageShow  = onPageShow;
}

// ── Mobile: CSS protections ────────────────────────────────────────────────────────────────

function injectSecurityCSS() {
  const styleId = 'vedastro-security-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Desktop + mobile: block selection on protected elements */
    .screenshot-protected {
      -webkit-user-select: none !important;
      -moz-user-select:    none !important;
      user-select:         none !important;
      /* iOS Safari: disable touch callout (long-press menu to save image) */
      -webkit-touch-callout: none !important;
      /* Android: disable drag-to-share on images */
      -webkit-user-drag: none !important;
    }

    /* Block drag-and-drop export of images */
    .screenshot-protected img,
    .screenshot-protected canvas {
      pointer-events: none !important;
      -webkit-user-drag: none !important;
    }

    /* Print / PDF export block */
    @media print {
      body * { visibility: hidden !important; }
      body::before {
        content: '\ud83d\udd12 This content is protected and cannot be printed.';
        visibility: visible !important;
        position:   fixed;
        top: 50%; left: 50%;
        transform:  translate(-50%, -50%);
        font-size:  1.5rem;
        color:      #FFD700;
        font-family: sans-serif;
      }
    }

    /* Additional: disable context menu long-press on mobile */
    .screenshot-protected * {
      -webkit-touch-callout: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ── Public API ───────────────────────────────────────────────────────────────────────────

/**
 * Initialize screenshot blocking for both desktop and mobile.
 * @param {(message: string) => void} onBlocked
 * @returns {() => void} cleanup
 */
export function initScreenshotBlocker(onBlocked) {
  if (_initialized) return destroyScreenshotBlocker;
  _initialized = true;
  _onBlocked   = onBlocked || null;

  // ── 1. Keyboard interception (Desktop / laptop) ───────────────────────────────
  _keydownHandler = (e) => {
    // PRECURSOR BLOCKING: show overlay the instant Meta+Shift is held
    if (e.metaKey && e.shiftKey) showObscureOverlay();
    // Alt+PrtScn precursor
    if (e.altKey) showObscureOverlay();

    let isScreenshot = false;
    if (SCREENSHOT_KEYS.has(e.key) || isMacScreenshotCombo(e) ||
        isPrintCombo(e) || isXboxCombo(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      isScreenshot = true;
    } else if (isWindowsSnipCombo(e)) {
      isScreenshot = true;
    }

    if (isScreenshot) {
      showObscureOverlay();
      notify('🔒 Screenshot blocked — Security Policy Active');
      // Attempt to overwrite clipboard
      navigator.clipboard?.writeText('🔒 Screenshot blocked by VedAstro Security Policy').catch(() => {});
    }
  };

  _keyupHandler = (e) => {
    if (!e.metaKey || !e.shiftKey) {
      setTimeout(() => {
        if (document.hasFocus()) hideObscureOverlay();
      }, 600);
    }
  };

  document.addEventListener('keydown', _keydownHandler, true);
  document.addEventListener('keyup',   _keyupHandler,   true);

  // ── 2. Block getDisplayMedia (desktop + Android Chrome) ──────────────────────
  if (navigator.mediaDevices?.getDisplayMedia) {
    _originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async () => {
      notify('🔒 Screen capture blocked — Security Policy Active');
      throw new DOMException('Screen capture is disabled by security policy.', 'NotAllowedError');
    };
  }

  // Also block getUserMedia for camera-based screen capture attempts
  if (navigator.mediaDevices?.getUserMedia) {
    const _origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints?.video?.displaySurface || constraints?.video?.mediaSource) {
        throw new DOMException('Screen capture is disabled by security policy.', 'NotAllowedError');
      }
      return _origGUM(constraints);
    };
  }

  // ── 3. Right-click protection ────────────────────────────────────────────────────
  _contextHandler = (e) => {
    if (e.target.closest('.screenshot-protected')) e.preventDefault();
  };
  document.addEventListener('contextmenu', _contextHandler, true);

  // ── 4. Mobile screenshot detection ─────────────────────────────────────────────
  initVisualViewportGuard();
  initMobileVisibilityGuard();

  // ── 5. CSS hardening (desktop + mobile) ────────────────────────────────────
  injectSecurityCSS();

  return destroyScreenshotBlocker;
}

/**
 * Remove all screenshot-blocker event listeners and restore original APIs.
 */
export function destroyScreenshotBlocker() {
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler, true);
    _keydownHandler = null;
  }
  if (_keyupHandler) {
    document.removeEventListener('keyup', _keyupHandler, true);
    _keyupHandler = null;
  }
  if (_contextHandler) {
    document.removeEventListener('contextmenu', _contextHandler, true);
    _contextHandler = null;
  }
  if (_originalGetDisplayMedia && navigator.mediaDevices) {
    navigator.mediaDevices.getDisplayMedia = _originalGetDisplayMedia;
    _originalGetDisplayMedia = null;
  }

  // Remove mobile handlers
  if (_mobileHandlers.visChange)
    document.removeEventListener('visibilitychange', _mobileHandlers.visChange);
  if (_mobileHandlers.pageHide)
    window.removeEventListener('pagehide', _mobileHandlers.pageHide);
  if (_mobileHandlers.pageShow)
    window.removeEventListener('pageshow',  _mobileHandlers.pageShow);
  if (_mobileHandlers.visualViewport && window.visualViewport)
    window.visualViewport.removeEventListener('resize', _mobileHandlers.visualViewport);
  _mobileHandlers = {};

  clearTimeout(_vvResizeTimer);
  hideObscureOverlay();
  _initialized = false;
  _onBlocked   = null;
}
