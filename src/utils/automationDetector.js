/**
 * automationDetector.js — Puppeteer, Headless Browser & Automated Script Detection
 *
 * Detects:
 * - Puppeteer, Playwright, Selenium, HeadlessChrome
 * - Programmatic script injection and synthetic untrusted events
 * - Global automation artifacts and headless environment anomalies
 */

export function detectAutomation() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isAutomated: false, reasons: [] };
  }

  const reasons = [];

  // 1. Standard WebDriver flag (Puppeteer / Playwright / Selenium default)
  if (navigator.webdriver === true || 'webdriver' in navigator) {
    reasons.push('Headless WebDriver active (navigator.webdriver === true)');
  }

  // 2. User Agent examination
  const ua = navigator.userAgent || '';
  if (/HeadlessChrome|PhantomJS|Selenium|WebDriver/i.test(ua)) {
    reasons.push('Automated headless User-Agent signature');
  }

  // 3. Known Automation Globals injected by Puppeteer & Test runners
  const suspiciousGlobals = [
    '__puppeteer_evaluation_script__',
    '__webdriver_evaluate',
    '__selenium_evaluate',
    '__webdriver_script_fn',
    '__webdriver_script_func',
    '__fxdriver_evaluate',
    '__driver_evaluate',
    '__webdriver_unwrapped',
    'callPhantom',
    '_phantom',
    'domAutomation',
    'domAutomationController',
  ];

  for (const key of suspiciousGlobals) {
    if (key in window || window[key] !== undefined) {
      reasons.push(`Automation runtime property detected: ${key}`);
    }
  }

  // 4. Desktop Chrome environment anomalies
  if (ua.includes('Chrome') && !ua.includes('Mobile')) {
    // Headless chrome often strips or zeroes plugins
    if (!navigator.plugins || navigator.plugins.length === 0) {
      reasons.push('Desktop browser with zero plugins (Headless flag)');
    }
    // Headless environments sometimes lack window.chrome
    if (!window.chrome) {
      reasons.push('Missing window.chrome in Chrome-identified browser');
    }
  }

  // 5. Zero Window Dimensions
  if (window.outerWidth === 0 && window.outerHeight === 0) {
    reasons.push('Zero outer dimensions (Headless render target)');
  }

  return {
    isAutomated: reasons.length > 0,
    reasons,
  };
}

/**
 * Checks if a user event is synthetic (dispatched via script rather than real human interaction)
 */
export function isSyntheticEvent(e) {
  if (!e) return false;
  // Browser standard: real human events have isTrusted = true
  // Programmatic event dispatch (e.g. element.dispatchEvent) has isTrusted = false
  if (e.isTrusted === false) return true;
  return false;
}

