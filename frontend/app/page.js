'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// API Base URL config: uses env var or defaults to localhost backend port 5000
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const IconKey = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3L22 7l-3-3" />
  </svg>
);
const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
const IconAlertCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconPhone = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 14.09 15.9l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconFingerprint = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
    <path d="M5 19.5C5.5 18 6 15 6 12c0-1.7.6-3.2 1.6-4.4" />
    <path d="M17.5 10c.3.8.5 1.9.5 3.5 0 3-1 5.5-2.5 6.5" />
    <path d="M10 9.4C10.7 8.5 11.3 8 12 8c2.2 0 4 1.8 4 4" />
    <path d="M9 13c.1 2-.5 3.8-1.5 5" />
    <path d="M14 12.5c0 2.5-1.2 4.5-2.5 5.5" />
  </svg>
);
const IconLogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconBadgeCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// ─── Error Message Helper ─────────────────────────────────────────────────────
function parseError(err) {
  const msg = err?.message || String(err);
  if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('cancel'))
    return 'ยกเลิกการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง';
  if (msg.includes('NotSupportedError'))
    return 'อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ FIDO2';
  if (msg.includes('TimeoutError') || msg.includes('timeout'))
    return 'หมดเวลาการยืนยันตัวตน กรุณาลองใหม่';
  if (msg.includes('InvalidStateError'))
    return 'Credential นี้ถูกลงทะเบียนไปแล้ว';
  return msg;
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({
    username: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Step 1: ขอ options จาก server backend (ต้องใส่ credentials: 'include' เพื่อรองรับ session cookie)
      const optRes = await fetch(`${API_BASE}/api/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error || 'เกิดข้อผิดพลาด');

      // Step 2: เรียก browser WebAuthn API
      const attResp = await startRegistration({ optionsJSON: optData });

      // Step 3: ส่ง response ไปให้ server verify (ต้องใส่ credentials: 'include' เพื่อส่ง session cookie คืน)
      const verRes = await fetch(`${API_BASE}/api/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
        credentials: 'include',
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error || 'การยืนยันล้มเหลว');

      setSuccessMsg(`สมัครสมาชิกสำเร็จ! กำลังนำไปหน้า Login...`);
      setTimeout(() => onSuccess(form.username), 1500);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-area">
      <h1 className="section-title">สมัครสมาชิก</h1>
      <p className="section-desc">ใช้ Biometric หรือ Security Key แทนรหัสผ่าน (Backend แยก)</p>

      {error && (
        <div className="error-banner" role="alert" id="register-error">
          <IconAlertCircle />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="success-banner" role="status" id="register-success">
          <IconCheck />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleRegister} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-username">Username</label>
          <input
            id="reg-username"
            name="username"
            type="text"
            className="form-input"
            placeholder="เช่น john_doe"
            value={form.username}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <button
          id="register-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <><div className="spinner" /><span>กำลังดำเนินการ...</span></>
          ) : (
            <><IconFingerprint /><span>สมัครสมาชิกด้วย FIDO2</span></>
          )}
        </button>
      </form>
    </div>
  );
}


// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ prefillUsername, onSuccess }) {
  const [username, setUsername] = useState(prefillUsername || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: ขอ options จาก backend (ต้องใส่ credentials: 'include' เพื่อรองรับ session cookie)
      const optRes = await fetch(`${API_BASE}/api/login/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
        credentials: 'include',
      });
      const optData = await optRes.json();
      if (!optRes.ok) throw new Error(optData.error || 'เกิดข้อผิดพลาด');

      // Step 2: Browser WebAuthn
      const assertResp = await startAuthentication({ optionsJSON: optData });

      // Step 3: Verify (ต้องใส่ credentials: 'include' เพื่อส่ง session cookie คืน)
      const verRes = await fetch(`${API_BASE}/api/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertResp),
        credentials: 'include',
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error || 'การยืนยันล้มเหลว');

      onSuccess(verData.user);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-area">
      <h1 className="section-title">เข้าสู่ระบบ</h1>
      <p className="section-desc">ยืนยันตัวตนด้วย Biometric หรือ Security Key โดยไม่ต้องใช้รหัสผ่าน</p>

      {error && (
        <div className="error-banner" role="alert" id="login-error">
          <IconAlertCircle />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            className="form-input"
            placeholder="กรอก username ของคุณ"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <button
          id="login-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading || !username.trim()}
        >
          {loading ? (
            <><div className="spinner" /><span>กำลังยืนยันตัวตน...</span></>
          ) : (
            <><IconFingerprint /><span>เข้าสู่ระบบด้วย FIDO2</span></>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ user, onLogout }) {
  return (
    <div className="success-screen">
      <div className="success-icon">
        <IconShield />
      </div>
      <h1 className="success-title">เข้าสู่ระบบสำเร็จ!</h1>
      <p className="success-subtitle">ยืนยันตัวตนด้วย FIDO2 / WebAuthn เรียบร้อย</p>

      <div
        className="badge badge-success"
        style={{ marginBottom: '24px', display: 'inline-flex' }}
      >
        <IconBadgeCheck />
        <span>Passwordless Authentication</span>
      </div>

      <div className="user-info-card">
        <div className="user-info-row">
          <div className="user-info-icon"><IconKey /></div>
          <div>
            <div className="user-info-label">Username</div>
            <div className="user-info-value" id="user-username">{user.username}</div>
          </div>
        </div>
      </div>

      <button
        id="logout-btn"
        className="btn btn-danger"
        onClick={onLogout}
      >
        <IconLogOut />
        <span>ออกจากระบบ</span>
      </button>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState('register');
  const [prefillUsername, setPrefillUsername] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleRegisterSuccess = (username) => {
    setPrefillUsername(username);
    setActiveTab('login');
  };

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setPrefillUsername('');
    setActiveTab('login');
  };

  return (
    <>
      {/* Animated background */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <main className="page-wrapper">
        {/* Header */}
        <header className="app-header">
          <div className="app-logo" aria-hidden="true">
            <IconKey />
          </div>
          <h2 className="app-title">FIDO2 WebAuthn</h2>
          <p className="app-subtitle">ระบบยืนยันตัวตนไร้รหัสผ่าน · Passwordless Authentication (แยก Frontend)</p>
        </header>

        {/* Main Card */}
        <div className="card" role="main">
          {loggedInUser ? (
            <SuccessScreen user={loggedInUser} onLogout={handleLogout} />
          ) : (
            <>
              {/* Tab Navigation */}
              <nav className="tab-nav" role="tablist" aria-label="ระบบยืนยันตัวตน">
                <button
                  id="tab-register"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  สมัครสมาชิก
                </button>
                <button
                  id="tab-login"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  เข้าสู่ระบบ
                </button>
              </nav>

              {/* Tab Content */}
              {activeTab === 'register' ? (
                <RegisterForm onSuccess={handleRegisterSuccess} />
              ) : (
                <LoginForm
                  prefillUsername={prefillUsername}
                  onSuccess={handleLoginSuccess}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <p>
            อ้างอิง{' '}
            <a href="https://webauthn.io" target="_blank" rel="noopener noreferrer">
              webauthn.io
            </a>{' '}
            · มาตรฐาน{' '}
            <a href="https://fidoalliance.org/fido2/" target="_blank" rel="noopener noreferrer">
              FIDO2 / W3C WebAuthn
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
