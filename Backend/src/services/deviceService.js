const crypto = require('crypto');

const MAX_ACCOUNTS_PER_DEVICE = 3;
const DEVICE_LIMIT_MESSAGE = 'Thiết bị này đã đạt giới hạn tối đa 3 tài khoản đăng ký. Vui lòng sử dụng tài khoản hiện có.';
const DEVICE_SALT = process.env.DEVICE_SALT || process.env.JWT_SECRET || 'affiliate-shoppe-device-salt-2026';

// In-memory mutex map for preventing concurrent registration races on the same device
const deviceLocks = new Map();

async function acquireLock(key) {
  while (deviceLocks.has(key)) {
    await deviceLocks.get(key);
  }
  let unlock;
  const promise = new Promise((resolve) => {
    unlock = resolve;
  });
  deviceLocks.set(key, promise);
  return () => {
    deviceLocks.delete(key);
    unlock();
  };
}

/**
 * Extracts and normalizes client IP from request
 */
function getClientIp(req) {
  if (!req) return '127.0.0.1';
  let ip = req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  // Normalize IPv6 mapped IPv4 format (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip.trim();
}

/**
 * Securely hashes an IP address with secret key
 */
function hashIp(rawIp) {
  const normalized = (rawIp || '127.0.0.1').trim();
  return crypto.createHmac('sha256', DEVICE_SALT).update(normalized).digest('hex');
}

/**
 * Normalizes and hashes device fingerprint
 */
function hashFingerprint(rawFingerprint, req) {
  let fp = typeof rawFingerprint === 'string' ? rawFingerprint.trim() : '';

  // If client fingerprint is missing or abnormally short, combine with server-side hints
  if (!fp || fp.length < 8) {
    const userAgent = req?.headers['user-agent'] || 'unknown-ua';
    const acceptLang = req?.headers['accept-language'] || 'unknown-lang';
    fp = `fallback_${userAgent}_${acceptLang}`;
  }

  return crypto.createHmac('sha256', DEVICE_SALT).update(fp).digest('hex');
}

/**
 * Checks device registration quota without recording
 */
async function checkDeviceQuota(db, clientFingerprint, req) {
  const fpHash = hashFingerprint(clientFingerprint, req);
  const device = await db.get('SELECT id FROM devices WHERE device_fingerprint_hash = ?', [fpHash]);

  if (!device) {
    return {
      allowed: true,
      currentCount: 0,
      maxAllowed: MAX_ACCOUNTS_PER_DEVICE,
      fingerprintHash: fpHash
    };
  }

  const result = await db.get(
    'SELECT COUNT(*) as count FROM device_registrations WHERE device_id = ?',
    [device.id]
  );
  const currentCount = result ? Number(result.count) : 0;

  return {
    allowed: currentCount < MAX_ACCOUNTS_PER_DEVICE,
    currentCount,
    maxAllowed: MAX_ACCOUNTS_PER_DEVICE,
    deviceId: device.id,
    fingerprintHash: fpHash,
    message: currentCount >= MAX_ACCOUNTS_PER_DEVICE ? DEVICE_LIMIT_MESSAGE : undefined
  };
}

/**
 * Atomically verifies device quota and records the new user registration.
 * Guarantees that concurrent requests cannot exceed MAX_ACCOUNTS_PER_DEVICE.
 */
async function recordUserRegistration(db, { userId, clientFingerprint, req }) {
  const fpHash = hashFingerprint(clientFingerprint, req);
  const rawIp = getClientIp(req);
  const ipHash = hashIp(rawIp);

  // Acquire concurrency lock on this specific device fingerprint
  const releaseLock = await acquireLock(fpHash);

  try {
    // 1. Check or create device
    let device = await db.get('SELECT id FROM devices WHERE device_fingerprint_hash = ?', [fpHash]);

    if (!device) {
      const newDeviceId = `DEV_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await db.run(
        `INSERT INTO devices (id, device_fingerprint_hash, first_seen_at, last_seen_at, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newDeviceId, fpHash]
      );
      device = { id: newDeviceId };
    } else {
      // Update last seen
      try {
        await db.run('UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [device.id]);
      } catch (e) {}
    }

    // 2. Count existing registrations for this device
    const countRow = await db.get(
      'SELECT COUNT(*) as count FROM device_registrations WHERE device_id = ?',
      [device.id]
    );
    const currentCount = countRow ? Number(countRow.count) : 0;

    if (currentCount >= MAX_ACCOUNTS_PER_DEVICE) {
      const err = new Error(DEVICE_LIMIT_MESSAGE);
      err.code = 'DEVICE_LIMIT_EXCEEDED';
      err.statusCode = 403;
      err.currentCount = currentCount;
      throw err;
    }

    // 3. Check if user was already registered in device_registrations (idempotency)
    const existingReg = await db.get(
      'SELECT id FROM device_registrations WHERE user_id = ?',
      [userId]
    );

    if (!existingReg) {
      const regId = `DREG_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      await db.run(
        `INSERT INTO device_registrations (id, user_id, device_id, registration_ip_hash, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [regId, userId, device.id, ipHash]
      );
    }

    return {
      success: true,
      deviceId: device.id,
      registeredCount: currentCount + 1,
      maxAllowed: MAX_ACCOUNTS_PER_DEVICE
    };
  } finally {
    releaseLock();
  }
}

module.exports = {
  MAX_ACCOUNTS_PER_DEVICE,
  DEVICE_LIMIT_MESSAGE,
  getClientIp,
  hashIp,
  hashFingerprint,
  checkDeviceQuota,
  recordUserRegistration
};

