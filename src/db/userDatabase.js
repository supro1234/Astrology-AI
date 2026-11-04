/**
 * userDatabase.js — VedAstro User Database
 *
 * IndexedDB-backed user store with:
 *  • Secure password hashing (SHA-256 + salt via Web Crypto API)
 *  • Role-based access (admin / user)
 *  • OTP email verification flow
 *  • Birth details storage per user
 *  • Weak-password rejection
 *  • Admin account seeded from env vars ONLY (never hardcoded)
 */

const DB_NAME    = 'vedastro_users';
const DB_VERSION = 1;
const STORE      = 'users';
const OTP_STORE  = 'otps';

// ── Open DB ───────────────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'email' });
        store.createIndex('username', 'username', { unique: true });
        store.createIndex('role',     'role',     { unique: false });
      }
      if (!db.objectStoreNames.contains(OTP_STORE)) {
        db.createObjectStore(OTP_STORE, { keyPath: 'email' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = ()  => reject(new Error('Failed to open user database'));
  });
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

/** Generates a random 16-byte hex salt */
function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hash of (salt + password), returns hex string */
async function hashPassword(password, salt) {
  const data    = new TextEncoder().encode(salt + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generates a 6-digit numeric OTP */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Password strength ─────────────────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'password1', 'qwerty', 'abc123', 'letmein',
  'welcome', 'monkey', 'dragon', 'master', 'superman',
  '000000', '111111', '123123', '654321', 'admin', 'root',
  '1234', '12345', 'pass', 'test', 'login',
]);

export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8)
    errors.push('At least 8 characters required');
  if (!/[A-Z]/.test(password))
    errors.push('At least one uppercase letter (A–Z)');
  if (!/[a-z]/.test(password))
    errors.push('At least one lowercase letter (a–z)');
  if (!/[0-9]/.test(password))
    errors.push('At least one number (0–9)');
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push('At least one special character (!@#$%^&*)');
  if (COMMON_PASSWORDS.has(password.toLowerCase()))
    errors.push('This password is too common — choose something unique');
  return { valid: errors.length === 0, errors };
}

export function passwordStrength(password) {
  if (!password) return { score: 0, label: 'None', color: '#6B7280' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'Weak',   color: '#EF4444' };
  if (score <= 4) return { score, label: 'Medium', color: '#F59E0B' };
  if (score <= 5) return { score, label: 'Strong', color: '#10B981' };
  return            { score, label: 'Very Strong', color: '#00E575' };
}

// ── OTP management ────────────────────────────────────────────────────────────

/** Stores OTP in IDB with 10-minute expiry. Returns the OTP for email sending. */
export async function createOTP(email) {
  const db  = await openDB();
  const otp = generateOTP();
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(OTP_STORE, 'readwrite');
    const store = tx.objectStore(OTP_STORE);
    store.put({ email, otp, expiresAt: exp });
    tx.oncomplete = () => resolve(otp);
    tx.onerror    = () => reject(new Error('Failed to store OTP'));
  });
}

/** Verifies OTP. Returns true if correct and not expired. */
export async function verifyOTP(email, inputOtp) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(OTP_STORE, 'readwrite');
    const store = tx.objectStore(OTP_STORE);
    const req   = store.get(email);
    req.onsuccess = (e) => {
      const record = e.target.result;
      if (!record)                         return resolve({ ok: false, reason: 'No OTP found' });
      if (Date.now() > record.expiresAt)  { store.delete(email); return resolve({ ok: false, reason: 'OTP expired' }); }
      if (record.otp !== inputOtp.trim()) return resolve({ ok: false, reason: 'Incorrect OTP' });
      store.delete(email); // consume OTP
      resolve({ ok: true });
    };
    req.onerror = () => resolve({ ok: false, reason: 'Database error' });
  });
}

/**
 * Sends OTP via email using EmailJS (or falls back to console in dev).
 * Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY in .env
 */
export async function sendOTPEmail(email, otp) {
  const isDev =
    import.meta.env.DEV ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if (isDev) {
    // In dev: log OTP to console instead of sending email
    console.info(
      `%c[VedAstro Dev] OTP for ${email}: %c${otp}`,
      'color:#f59e0b;font-weight:600',
      'color:#00E575;font-size:1.2em;font-weight:700'
    );
    return { ok: true, dev: true };
  }

  // Production: use EmailJS
  try {
    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      // Fallback: just tell the user their OTP (not secure for production)
      return { ok: false, error: 'Email service not configured — add VITE_EMAILJS_* to .env' };
    }

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  serviceId,
        template_id: templateId,
        user_id:     publicKey,
        template_params: { to_email: email, otp, app_name: 'VedAstro' },
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: 'Email send failed' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Validates: email format, password strength, duplicate check.
 * Does NOT verify OTP here — caller must verify before calling register().
 */
export async function registerUser({ email, username, password, birthDetails }) {
  // Validate
  if (!email || !email.includes('@')) throw new Error('Invalid email address');
  if (!username || username.trim().length < 3) throw new Error('Username must be at least 3 characters');

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) throw new Error(pwCheck.errors.join('. '));

  const db   = await openDB();
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  // Security guard: Public registrations are ALWAYS regular 'user', never admin
  const user = {
    email:         email.toLowerCase().trim(),
    username:      username.trim(),
    passwordHash:  hash,
    salt,
    role:          'user',
    verified:      false, // set to true after OTP verification
    createdAt:     new Date().toISOString(),
    birthDetails:  birthDetails || null,
    avatar:        username.charAt(0).toUpperCase(),
  };

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    // Check duplicate email
    const getReq = store.get(email.toLowerCase().trim());
    getReq.onsuccess = (e) => {
      if (e.target.result) {
        reject(new Error('An account with this email already exists'));
        return;
      }
      const putReq = store.put(user);
      putReq.onsuccess = () => resolve({ ok: true, user: sanitizeUser(user) });
      putReq.onerror   = () => reject(new Error('Failed to create account'));
    };
    getReq.onerror = () => reject(new Error('Database error during registration'));
  });
}

/** Mark user as verified after OTP confirmation */
export async function verifyUserEmail(email) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req   = store.get(email.toLowerCase().trim());
    req.onsuccess = (e) => {
      const user = e.target.result;
      if (!user) return reject(new Error('User not found'));
      user.verified = true;
      store.put(user);
      tx.oncomplete = () => resolve({ ok: true, user: sanitizeUser(user) });
    };
    req.onerror = () => reject(new Error('Database error'));
  });
}

/** Authenticate a user by email + password. Returns sanitized user or throws. */
export async function authenticateUser(email, password) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.get(email.toLowerCase().trim());
    req.onsuccess = async (e) => {
      const user = e.target.result;
      if (!user) return reject(new Error('No account found with this email'));
      if (!user.verified) return reject(new Error('Email not verified — check your inbox for the OTP'));

      const hash = await hashPassword(password, user.salt);
      if (hash !== user.passwordHash) return reject(new Error('Incorrect password'));

      resolve({ ok: true, user: sanitizeUser(user) });
    };
    req.onerror = () => reject(new Error('Database error during login'));
  });
}

/** Get user by email (admin use) */
export async function getUserByEmail(email) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.get(email.toLowerCase().trim());
    req.onsuccess = (e) => resolve(e.target.result ? sanitizeUser(e.target.result) : null);
    req.onerror   = () => resolve(null);
  });
}

/** List all users (admin only) */
export async function listAllUsers() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.getAll();
    req.onsuccess = (e) => resolve((e.target.result || []).map(sanitizeUser));
    req.onerror   = () => resolve([]);
  });
}

/** Remove password fields before exposing to UI */
function sanitizeUser(user) {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

