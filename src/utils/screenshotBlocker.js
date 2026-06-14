/**
 * screenshotBlocker.js — VedAstro Security Layer
 *
 * Blocks all common screenshot methods:
 *   • PrintScreen / Ctrl+PrtScn / Alt+PrtScn
 *   • Ctrl+P / Cmd+P  (print → screenshot)
 *   • macOS Cmd+Shift+3 / Cmd+Shift+4 / Cmd+Shift+5
 *   • navigator.mediaDevices.getDisplayMedia (screen capture API)
 *   • Right-click context menu (on .screenshot-protected elements)
 *   • CSS pointer-events + user-select on sensitive containers
 *
 * Usage:
 *   const cleanup = initScreenshotBlocker(onBlockedCallback);
 *   cleanup(); // removes all listeners
 */

let _onBlocked = null;
let _originalGetDisplayMedia = null;
let _keydownHandler = null;
let _keyupHandler = null;
let _contextHandler = null;
let _initialized = false;
let _obscureOverlay = null;
const OVERLAY_ID = 'vedastro-security-obscure-overlay';

function showObscureOverlay() {
  if (!document.getElementById(OVERLAY_ID)) {
    _obscureOverlay = document.createElement('div');
    _obscureOverlay.id = OVERLAY_ID;
    _obscureOverlay.style.position = 'fixed';
    _obscureOverlay.style.top = '0';
    _obscureOverlay.style.left = '0';
    _obscureOverlay.style.width = '100vw';
    _obscureOverlay.style.height = '100vh';
    _obscureOverlay.style.background = '#000';
    _obscureOverlay.style.zIndex = '2147483647';
    _obscureOverlay.innerHTML = '<div style="color:#ef4444; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:sans-serif; font-weight:bold; font-size:24px;">🔒 Screenshot Blocked</div>';
    document.body.appendChild(_obscureOverlay);
  }
}

function hideObscureOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

/** Keys that map to PrintScreen across different OS / keyboards */
const SCREENSHOT_KEYS = new Set([
  'PrintScreen',
  'Print',
  'Snapshot',
]);

/** macOS screenshot key combos: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Cmd+Shift+6 */
function isMacScreenshotCombo(e) {
  return e.metaKey && e.shiftKey && ['3', '4', '5', '6', 's', 'S'].includes(e.key);
}

/** Ctrl+P / Cmd+P (Print dialog, often used to save as PDF / screenshot) */
function isPrintCombo(e) {
  return (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
}

/** Windows Snipping Tool: Win+Shift+S */
function isWindowsSnipCombo(e) {
  return e.shiftKey && e.key === 'S' && !e.ctrlKey && !e.altKey;
}

function notify(message) {
  if (typeof _onBlocked === 'function') {
    _onBlocked(message);
  }
}

/**
 * Initialize screenshot blocking.
 * @param {(message: string) => void} onBlocked - Called when a screenshot attempt is blocked
 * @returns {() => void} cleanup function
 */
export function initScreenshotBlocker(onBlocked) {
  if (_initialized) return destroyScreenshotBlocker;
  _initialized = true;
  _onBlocked = onBlocked || null;

  // ── 1. Keyboard interception ────────────────────────────────────────────────
  _keydownHandler = (e) => {
    // PRECURSOR BLOCKING: Human fingers press modifiers slightly before the final key.
    // By obscuring instantly when Meta (Win/Cmd) + Shift are held, we beat the OS compositor freeze!
    if (e.metaKey && e.shiftKey) {
      showObscureOverlay();
    }

    let isScreenshot = false;
    if (SCREENSHOT_KEYS.has(e.key) || isMacScreenshotCombo(e) || isPrintCombo(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      isScreenshot = true;
    } else if (isWindowsSnipCombo(e)) {
      isScreenshot = true;
    }

    if (isScreenshot) {
      showObscureOverlay();
      notify('🔒 Screenshot blocked — Security Policy Active');
      
      // Attempt to overwrite clipboard in case the OS took the screenshot
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('🔒 Screenshot blocked by VedAstro Security Policy').catch(() => {});
      }
    }
  };

  _keyupHandler = (e) => {
    // If the user releases the modifier keys and no security violation is active, restore the screen
    // (Unless it was an actual screenshot, in which case tabSwitchGuard might have kicked in, or we just let focus handler do it)
    if (!e.metaKey || !e.shiftKey) {
      // Give it a tiny delay to ensure the OS tool has closed or fully opened (triggering blur)
      setTimeout(() => {
        if (document.hasFocus()) {
          hideObscureOverlay();
        }
      }, 500);
    }
  };

  document.addEventListener('keydown', _keydownHandler, true); // capture phase = highest priority
  document.addEventListener('keyup', _keyupHandler, true);

  // ── 2. Block getDisplayMedia (screen recording / capture API) ───────────────
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    _originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async () => {
      notify('🔒 Screen capture blocked — Security Policy Active');
      throw new DOMException(
        'Screen capture is disabled by security policy.',
        'NotAllowedError'
      );
    };
  }

  // ── 3. Block right-click on sensitive containers ────────────────────────────
  _contextHandler = (e) => {
    if (e.target.closest('.screenshot-protected')) {
      e.preventDefault();
    }
  };
  document.addEventListener('contextmenu', _contextHandler, true);

  // ── 4. CSS hardening — inject into <head> once ──────────────────────────────
  const styleId = 'vedastro-security-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .screenshot-protected {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
      @media print {
        body * { visibility: hidden !important; }
        body::before {
          content: "🔒 This content is protected and cannot be printed.";
          visibility: visible !important;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.5rem;
          color: #FFD700;
        }
      }
    `;
    document.head.appendChild(style);
  }

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
  
  hideObscureOverlay();
  
  _initialized = false;
  _onBlocked = null;
}
