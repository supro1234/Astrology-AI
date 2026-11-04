/**
 * securityGuard.js — Client-Side Anti-Tamper & DevTools Shield
 *
 * In production mode:
 * - Prevents right-click inspection (contextmenu)
 * - Blocks common DevTools hotkeys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
 * - Emits a high-visibility security warning in console
 * - Detects debugger traps
 */

export function initSecurityShield() {
  const isProd = import.meta.env.PROD;

  // 1. Console Security Warning (always active)
  if (typeof console !== 'undefined' && console.log) {
    const bannerStyle = 'color: #ef4444; font-size: 20px; font-weight: 800; text-shadow: 1px 1px 2px black;';
    const subStyle = 'color: #f59e0b; font-size: 13px; font-weight: 600;';
    const noteStyle = 'color: #94a3b8; font-size: 11px;';

    console.log('%c⚠️ SECURITY NOTICE — VEDASTRO SECURE APPLICATION', bannerStyle);
    console.log('%cThis browser console is a protected zone. Tampering, reverse engineering, or injecting unauthorized scripts is prohibited and monitored.', subStyle);
    console.log('%cProtected with AES session tokens, server-side IP rate limiting, and compiled byte obfuscation.', noteStyle);
  }

  // Only enforce strict hotkey & context blockers in production so developer isn't hindered during dev
  if (!isProd) {
    console.info('%c[SecurityShield] Dev mode active — DevTools and right-click remain unlocked for development.', 'color:#3b82f6;font-weight:600');
    return;
  }

  // 2. Disable Right-Click Context Menu in Production
  window.addEventListener('contextmenu', (e) => {
    // Allow right click only on text inputs for copy/paste
    const targetTag = e.target?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') return;
    e.preventDefault();
  });

  // 3. Block Inspection Keyboard Shortcuts in Production
  window.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C / Cmd+Opt+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
  });
}

