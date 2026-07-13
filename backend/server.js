const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const dotenv = require('dotenv');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const {
  findUserByUsername,
  createUser,
  updateUserCredential,
} = require('./lib/users');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting credentials (cookies) cross-origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for dev/demo, but echo back the origin to support credentials: true
    callback(null, origin || true);
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Helper function to dynamically compute rpID and origin based on frontend request
function getRpConfig(req) {
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      const url = new URL(req.headers.referer);
      origin = url.origin;
    } catch {}
  }
  if (!origin) {
    origin = 'http://localhost:3000';
  }

  let rpID = 'localhost';
  try {
    const url = new URL(origin);
    rpID = url.hostname;
  } catch {}

  return { rpID, origin };
}

// Helper to set pending session cookie dynamically
function setPendingCookie(res, name, value, isHttps) {
  res.cookie(name, JSON.stringify(value), {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 300 * 1000, // 5 mins
    path: '/'
  });
}

// Helper to clear pending session cookie dynamically
function clearPendingCookie(req, res, name) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || (req.headers.origin && req.headers.origin.startsWith('https:'));
  res.clearCookie(name, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/'
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

// 1. POST /api/register/options
app.post('/api/register/options', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'กรุณากรอก username' });
    }

    const existing = findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: `username "${username}" ถูกใช้ไปแล้ว` });
    }

    const { rpID } = getRpConfig(req);
    const userID = crypto.randomUUID();

    const options = await generateRegistrationOptions({
      rpName: 'FIDO2 WebAuthn Demo (Backend Separated)',
      rpID,
      userID: new TextEncoder().encode(userID),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const pendingData = {
      challenge: options.challenge,
      userID,
      username,
    };

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || (req.headers.origin && req.headers.origin.startsWith('https:'));
    setPendingCookie(res, 'fido2_pending_reg', pendingData, isHttps);

    return res.json(options);
  } catch (err) {
    console.error('[register/options]', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

// 2. POST /api/register/verify
app.post('/api/register/verify', async (req, res) => {
  try {
    const pendingCookie = req.cookies['fido2_pending_reg'];

    if (!pendingCookie) {
      return res.status(400).json({ error: 'ไม่พบ session การสมัครสมาชิก หรือหมดเวลาแล้ว (5 นาที)' });
    }

    const pending = JSON.parse(pendingCookie);
    const { rpID, origin } = getRpConfig(req);
    const body = req.body;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    // Clear registration session cookie
    clearPendingCookie(req, res, 'fido2_pending_reg');

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'การยืนยันตัวตนล้มเหลว กรุณาลองใหม่อีกครั้ง' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const existing = findUserByUsername(pending.username);
    if (existing) {
      return res.status(409).json({ error: `username "${pending.username}" ถูกใช้ไปแล้ว` });
    }

    const newUser = {
      id: pending.userID,
      username: pending.username,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        transports: body.response?.transports ?? [],
      },
      credentialDeviceType,
      credentialBackedUp,
      createdAt: new Date().toISOString(),
    };

    createUser(newUser);

    return res.json({ success: true, username: pending.username });
  } catch (err) {
    console.error('[register/verify]', err);
    clearPendingCookie(req, res, 'fido2_pending_reg');
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

// 3. POST /api/login/options
app.post('/api/login/options', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'กรุณาระบุ username' });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: `ไม่พบผู้ใช้งาน "${username}" กรุณาตรวจสอบ username` });
    }

    const { rpID } = getRpConfig(req);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: [
        {
          id: user.credential.id,
          transports: user.credential.transports ?? [],
        },
      ],
    });

    const pendingData = {
      challenge: options.challenge,
      username: user.username,
    };

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || (req.headers.origin && req.headers.origin.startsWith('https:'));
    setPendingCookie(res, 'fido2_pending_auth', pendingData, isHttps);

    return res.json(options);
  } catch (err) {
    console.error('[login/options]', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

// 4. POST /api/login/verify
app.post('/api/login/verify', async (req, res) => {
  try {
    const pendingCookie = req.cookies['fido2_pending_auth'];

    if (!pendingCookie) {
      return res.status(400).json({ error: 'ไม่พบ session การเข้าสู่ระบบ หรือหมดเวลาแล้ว (5 นาที)' });
    }

    const pending = JSON.parse(pendingCookie);
    const { rpID, origin } = getRpConfig(req);
    const body = req.body;

    const user = findUserByUsername(pending.username);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const publicKey = Buffer.from(user.credential.publicKey, 'base64');

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: user.credential.id,
        publicKey: new Uint8Array(publicKey),
        counter: user.credential.counter,
        transports: user.credential.transports ?? [],
      },
    });

    // Clear login session cookie
    clearPendingCookie(req, res, 'fido2_pending_auth');

    if (!verification.verified) {
      return res.status(400).json({ error: 'การยืนยันตัวตนล้มเหลว ลายเซ็นไม่ถูกต้อง' });
    }

    updateUserCredential(pending.username, {
      ...user.credential,
      counter: verification.authenticationInfo.newCounter,
    });

    return res.json({
      success: true,
      user: {
        username: user.username,
      },
    });
  } catch (err) {
    console.error('[login/verify]', err);
    clearPendingCookie(req, res, 'fido2_pending_auth');
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

// Start backend server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
