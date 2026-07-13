# Context: โปรเจกต์ระบบยืนยันตัวตนไร้รหัสผ่าน (FIDO2 / WebAuthn)

## เป้าหมายของงานนี้ (ในมุมมองผู้เรียน)
งานนี้เป็น Assignment ในวิชาที่ต้องการให้ผู้เรียน:
1. เข้าใจแนวคิด Passwordless Authentication ด้วยมาตรฐาน FIDO2 / WebAuthn
2. ฝึกใช้ Generative AI (Google AI Studio) เป็นผู้ช่วยเขียนโค้ด (AI-Assisted Development)
   และบันทึกกระบวนการถาม-ตอบไว้เป็นหลักฐาน
3. ฝึก deploy เว็บแอปจริงขึ้นอินเทอร์เน็ตผ่าน https

## ทำไมเลือก implement crypto verification จริง (ไม่ mock ทั้งหมด)
โจทย์อนุญาตให้ mock backend หรือใช้ localStorage เพื่อลดความซับซ้อนได้ แต่ในเวอร์ชันที่สร้างจริง
เลือก implement การตรวจสอบ challenge/signature แบบเต็มรูปแบบด้วยไลบรารีมาตรฐาน
`@simplewebauthn` (ทั้งฝั่ง browser และ server) เพราะ:
- ไลบรารีนี้ทำให้ WebAuthn ceremony ที่ซับซ้อน (encode/decode, verify signature, ตรวจ origin/rpID)
  ใช้งานง่ายขึ้นมาก ไม่ต้องเขียน cryptography เองตั้งแต่ต้น
- ตรงกับเกณฑ์ให้คะแนนข้อ "FIDO2 Registration/Authentication ทำงานได้จริง" (รวม 50 คะแนน)
  ได้ดีกว่าการ mock แบบเทียบ credential id เฉย ๆ

สิ่งที่ยัง "mock" อยู่ตามที่โจทย์อนุญาตคือ **ชั้นเก็บข้อมูล (storage)**: ใช้ไฟล์ JSON
(`data/users.json`) แทนฐานข้อมูลจริง เพื่อโฟกัสที่ประสบการณ์ผู้ใช้ (UX) ของ flow
Registration/Authentication มากกว่าการตั้งฐานข้อมูล production

## สถาปัตยกรรมที่ implement จริง
- **Framework**: Next.js (App Router) — หน้าเว็บและ API routes อยู่ในโปรเจกต์เดียวกัน
- **Client**: `@simplewebauthn/browser` — `startRegistration()` / `startAuthentication()`
- **Server**: `@simplewebauthn/server` — `generateRegistrationOptions()`,
  `verifyRegistrationResponse()`, `generateAuthenticationOptions()`,
  `verifyAuthenticationResponse()` (4 API routes แยกตามหน้าที่)
- **Pending session**: เก็บ challenge ชั่วคราวใน httpOnly cookie (ไม่ใช้ server memory)
  เพื่อให้ทำงานได้ทั้งบน server แบบ persistent และแบบ serverless
- **rpID/origin**: คำนวณ dynamic จาก request header แทนการ hardcode
  ทำให้โค้ดชุดเดียวใช้ได้ทั้งตอนรันบน localhost และหลัง deploy จริง

## ข้อจำกัดทางเทคนิคที่ต้องรู้
- WebAuthn API ทำงานได้เฉพาะบน `https://` หรือ `localhost` — เปิดผ่าน `http://` ธรรมดา
  หรือ IP address จะใช้ไม่ได้
- ต้องทดสอบบนอุปกรณ์/เบราว์เซอร์ที่รองรับ platform authenticator จริง
  (เช่น มือถือที่มี fingerprint/Face ID, Windows ที่มี Windows Hello) หรือใช้ security key
- Credential ที่สร้างจะผูกกับ origin (โดเมน) นั้น ๆ — ถ้าเปลี่ยนโดเมนตอน deploy
  ต้อง register ใหม่
- **เรื่อง hosting**: GitHub Pages ใช้ไม่ได้เพราะไม่มี Node.js server รัน API routes
  Vercel รันได้แต่ filesystem เป็น ephemeral (ข้อมูลใน `users.json` อาจหายเมื่อ
  serverless function ถูกสร้างใหม่) ส่วน Render เหมาะที่สุดถ้าต้องการให้ข้อมูลอยู่ถาวร
  เพราะมี persistent disk ให้ mount

## Reference
- เว็บไซต์อ้างอิงพฤติกรรมระบบ: https://webauthn.io/
- เครื่องมือช่วยเขียนโค้ดที่บังคับใช้: https://aistudio.google.com
- บริการ hosting ฟรีที่แนะนำ: Vercel, Render, GitHub Pages

## สิ่งที่ต้องเตรียมส่งพร้อมกับตัวระบบ
- Live demo URL (ต้องเข้าถึงได้จริงผ่าน https)
- GitHub repo link
- ไฟล์ PDF สรุป prompt สำคัญที่ใช้คุยกับ Google AI Studio ระหว่างพัฒนา
  (ใช้เป็นหลักฐานกระบวนการคิด ไม่ใช่แค่ผลลัพธ์สุดท้าย)

## หมายเหตุสำหรับการพัฒนาต่อ (ใช้เป็น context เวลาถาม AI)
เวลาจะถาม Google AI Studio หรือ Claude เพื่อ generate โค้ดต่อจากนี้ ควรแนบทั้ง
`spec.md` (ข้อกำหนดระบบ) และ `context.md` (ไฟล์นี้) เป็น context ประกอบ
เพื่อให้ AI เข้าใจขอบเขตงาน, สิ่งที่อนุญาตให้ simplify (mock backend),
และ deliverables ที่ต้องส่งครบถ้วน

---

## รายงานผลการพัฒนา (Development Progress Log)

### ✅ Phase 1: Project Setup — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**
- สร้าง `package.json` แบบ manual (ชื่อ lowercase `webauth` เพื่อหลีกเลี่ยง npm naming error)
- ติดตั้ง Next.js 16 (latest, ปลอดช่องโหว่) + `@simplewebauthn/browser` + `@simplewebauthn/server` + `uuid`
- สร้าง `next.config.js` (server mode สำหรับ API routes) และ `jsconfig.json` (path alias `@/*`)
- สร้าง `app/layout.js` พร้อม SEO metadata ภาษาไทย

**ไฟล์ที่สร้าง:**
- `package.json`
- `next.config.js`
- `jsconfig.json`
- `app/layout.js`

---

### ✅ Phase 2: Data Layer — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**
- สร้าง `data/users.json` เป็น array ว่าง (mock storage ตามที่โจทย์อนุญาต)
- สร้าง `lib/users.js` — helper functions สำหรับ CRUD: `readUsers()`, `writeUsers()`, `findUserByUsername()`, `createUser()`, `updateUserCredential()`
- สร้าง `lib/rpConfig.js` — คำนวณ `rpID` และ `origin` แบบ dynamic จาก request header (ใช้ได้ทั้ง localhost และ domain จริง)

**ไฟล์ที่สร้าง:**
- `data/users.json`
- `lib/users.js`
- `lib/rpConfig.js`

---

### ✅ Phase 3: API Routes (4 routes) — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**

| Route | ไฟล์ | หน้าที่ |
|---|---|---|
| `POST /api/register/options` | `app/api/register/options/route.js` | สร้าง registration challenge + เก็บใน cookie |
| `POST /api/register/verify` | `app/api/register/verify/route.js` | ตรวจ challenge+signature + บันทึก user |
| `POST /api/login/options` | `app/api/login/options/route.js` | สร้าง authentication challenge |
| `POST /api/login/verify` | `app/api/login/verify/route.js` | ตรวจลายเซ็น + อัปเดต counter |

**จุดสำคัญที่ implement:**
- ทุก route ลบ cookie ทันทีหลัง verify (ป้องกัน replay attack)
- `register/verify` ตรวจ username ซ้ำอีกรอบ (race condition guard)
- `login/verify` อัปเดต `credential.counter` ทุกครั้งที่ login สำเร็จ (ป้องกัน credential cloning)
- Error messages เป็นภาษาไทยแยกตามสาเหตุ

---

### ✅ Phase 4: UI (Single Page) — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**
- สร้าง `app/globals.css` — design system ครบชุด:
  - Dark theme + glassmorphism card
  - Animated background orbs (3 ก้อน)
  - Google Fonts Inter
  - CSS custom properties (tokens)
  - Responsive layout
- สร้าง `app/page.js` — Single page 3 views:
  1. **RegisterForm** — 1 ช่อง (username) + FIDO2 button
  2. **LoginForm** — ช่อง username + FIDO2 button + prefill หลัง register
  3. **SuccessScreen** — แสดง username + badge FIDO2 + ปุ่ม logout
  4. **Error Banner** — แสดงทุก view, แยกข้อความตามสาเหตุ (ยกเลิก/timeout/ไม่รองรับ/ซ้ำ)

**ไฟล์ที่สร้าง:**
- `app/globals.css`
- `app/page.js`

---

### ✅ Phase 5: Deploy Config — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**
- สร้าง `render.yaml` — deploy บน Render พร้อม persistent disk 1GB mount ที่ `/opt/render/project/src/data`
- สร้าง `.gitignore`

**ผลการทดสอบ:**
- `npm run build` → ✅ Build สำเร็จ 100% (Next.js 16.2.10, Turbopack)
- `npm run dev` → ✅ Dev server รันที่ `http://localhost:3000`
- ทุก route ถูกต้อง: `/`, `/api/register/options`, `/api/register/verify`, `/api/login/options`, `/api/login/verify`

---

### ✅ Phase 6: Docker Integration — เสร็จสิ้น (2026-07-13)

**สิ่งที่ทำ:**
- สร้าง `Dockerfile` (Multi-stage build) — คอมไพล์ตัวแอปด้วย standalone mode เพื่อลดขนาดอิมเมจ และรันด้วย non-root user (`nextjs`) เพื่อความปลอดภัย
- เปิดโหมด `output: 'standalone'` ใน `next.config.js`
- สร้าง `docker-compose.yml` สำหรับรัน Container และผูก Named Volume (`webauth-data`) ไปที่ `/app/data` เพื่อรักษาข้อมูล `users.json` แบบ persistent
- สร้าง `.dockerignore` เพื่อละเว้นไฟล์ที่ไม่จำเป็นในตอน build context
- แก้ไขปัญหา Port 3000 ชนกับโฮสต์ และทำการทดสอบ Container Healthcheck จนผ่านเรียบร้อย

**ไฟล์ที่สร้าง/แก้ไข:**
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `next.config.js` (เปิดใช้งาน `standalone` output)

---

## โครงสร้างไฟล์สุดท้าย (Final File Structure)

```
d:\WebAuth\
├── app\
│   ├── api\
│   │   ├── register\
│   │   │   ├── options\route.js
│   │   │   └── verify\route.js
│   │   └── login\
│   │       ├── options\route.js
│   │       └── verify\route.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── data\
│   └── users.json
├── lib\
│   ├── rpConfig.js
│   └── users.js
├── .dockerignore
├── .gitignore
├── context.md
├── docker-compose.yml
├── Dockerfile
├── jsconfig.json
├── next.config.js
├── package.json
├── render.yaml
└── spec (1).md
```

## ขั้นตอนถัดไป (Next Steps)

1. **ทดสอบ flow บน localhost** — เปิด `http://localhost:3000` และทดสอบ Register + Login ด้วย Windows Hello หรือ fingerprint
2. **Push ขึ้น GitHub** — สร้าง repo และ push โค้ด
3. **Deploy บน Render** — เชื่อม GitHub repo + ตั้งค่า persistent disk
4. **ทดสอบบน https** — ทดสอบ flow ซ้ำบน production URL
5. **เก็บ AI Prompt Log** — รวบรวม prompt ที่ใช้ทำ PDF ส่งพร้อมงาน

