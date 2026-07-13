# Spec: ระบบยืนยันตัวตนไร้รหัสผ่านด้วย FIDO2 / WebAuthn

## 1. ภาพรวม
Web Application จำลอง (demo) ที่รองรับการสมัครสมาชิกและเข้าสู่ระบบโดยใช้มาตรฐาน
FIDO2 / WebAuthn แทนรหัสผ่าน (เช่น ลายนิ้วมือ, Face ID, Windows Hello, Security Key)
อ้างอิงพฤติกรรมจาก https://webauthn.io/

## 2. เทคโนโลยี / เงื่อนไขบังคับ
- ต้องรันบน `https://` หรือ `localhost` เท่านั้น (ข้อจำกัดของ WebAuthn API)
- **Framework: Next.js (App Router)** — frontend + backend (API Routes) อยู่ในโปรเจกต์เดียว
- **Client library: `@simplewebauthn/browser`** — เรียก `startRegistration()` /
  `startAuthentication()` แทนการเรียก `navigator.credentials.create()/get()` ตรง ๆ
- **Server library: `@simplewebauthn/server`** — implement WebAuthn ceremony แบบเต็มรูปแบบ
  (`generateRegistrationOptions`, `verifyRegistrationResponse`,
  `generateAuthenticationOptions`, `verifyAuthenticationResponse`)
  มีการตรวจสอบ challenge และ signature จริง **ไม่ใช่แค่ mock เทียบ credential id เฉย ๆ**
  (เกินกว่าที่โจทย์บังคับขั้นต่ำ เพื่อให้ได้คะแนนเต็มในหัวข้อ Registration/Authentication)
- Storage ผู้ใช้ใช้ไฟล์ JSON (`data/users.json`) อ่าน/เขียนผ่าน Node `fs` — เป็น mock backend
  ตามที่โจทย์อนุญาต แต่ตัว crypto verification เป็นของจริง
- Challenge ระหว่างขั้นตอน (pending session) เก็บใน **httpOnly cookie** ชั่วคราว
  (`fido2_pending_reg`, `fido2_pending_auth`) แทนการเก็บใน memory ของ server
  เพื่อให้ทำงานได้ทั้งบน server แบบ persistent และแบบ serverless
- ต้อง deploy ขึ้นจริงบนอินเทอร์เน็ต (แนะนำ: Render สำหรับข้อมูลถาวร, หรือ Vercel สำหรับ demo สั้น ๆ —
  **ไม่รองรับ GitHub Pages** เพราะต้องมี Node.js server รัน API routes)
- โค้ดต้องถูกช่วยเขียนผ่าน Google AI Studio (aistudio.google.com) และเก็บ log การถามไว้

## 3. ข้อมูลผู้ใช้งาน (User Data Model)
ฟอร์มสมัครสมาชิกต้องเก็บข้อมูล และรูปแบบการเก็บจริงใน `data/users.json`:

| ฟิลด์ | ประเภท | หมายเหตุ |
|---|---|---|
| id | string (uuid, auto) | ใช้เป็น WebAuthn `userID` ภายใน |
| username | string | ใช้เป็น identifier หลักตอน login |
| firstName | string | ชื่อจริง |
| lastName | string | นามสกุล |
| phoneNumber | string | หมายเลขโทรศัพท์ |
| credential.id | string, base64url (auto) | credential ID ที่ authenticator สร้างให้ |
| credential.publicKey | string, base64 (auto) | public key สำหรับตรวจลายเซ็นตอน login |
| credential.counter | number (auto) | ป้องกัน credential cloning/replay |
| credential.transports | string[] (auto) | เช่น `internal`, `hybrid` |
| credentialDeviceType | string (auto) | `singleDevice` หรือ `multiDevice` |
| credentialBackedUp | boolean (auto) | credential นี้ sync/สำรองไว้หรือไม่ |

> ไม่มีการเก็บรหัสผ่านหรือ private key ใด ๆ — private key อยู่ในอุปกรณ์ผู้ใช้เท่านั้น

## 4. Flow การทำงาน

### 4.1 Registration (สมัครสมาชิก)
1. ผู้ใช้กรอก username, ชื่อ, นามสกุล, เบอร์โทร แล้วกด "สมัครสมาชิกด้วย FIDO2"
2. Client เรียก `POST /api/register/options` → server ตรวจว่า username ซ้ำหรือไม่,
   เรียก `generateRegistrationOptions()`, เก็บ challenge + ข้อมูลฟอร์ม (ยังไม่บันทึกจริง)
   ไว้ใน cookie `fido2_pending_reg` (อายุ 5 นาที)
3. Client เรียก `startRegistration({ optionsJSON })` จาก `@simplewebauthn/browser`
   → เบราว์เซอร์ prompt ให้สแกนนิ้ว / Face ID / PIN
4. Client ส่งผลลัพธ์ไปที่ `POST /api/register/verify` → server เรียก
   `verifyRegistrationResponse()` ตรวจ challenge + signature จริง
5. ถ้าผ่าน: บันทึกผู้ใช้ + credential ลง `data/users.json`, ลบ cookie, คืน `{ success: true }`
6. Client สลับไปแท็บ Login พร้อม prefill username ที่เพิ่งสมัคร

### 4.2 Authentication (เข้าสู่ระบบ)
1. ผู้ใช้กรอกเฉพาะ username แล้วกด "เข้าสู่ระบบด้วย FIDO2"
2. Client เรียก `POST /api/login/options` → server ค้นหาผู้ใช้ (ถ้าไม่พบ คืน error
   "ไม่พบผู้ใช้งานนี้" ทันที), เรียก `generateAuthenticationOptions()` พร้อม
   `allowCredentials` ของผู้ใช้คนนั้น, เก็บ challenge ไว้ใน cookie `fido2_pending_auth`
3. Client เรียก `startAuthentication({ optionsJSON })` → เบราว์เซอร์ prompt ยืนยันตัวตน
4. Client ส่งผลลัพธ์ไปที่ `POST /api/login/verify` → server เรียก
   `verifyAuthenticationResponse()` ตรวจลายเซ็นด้วย public key ที่เก็บไว้จริง
5. ถ้าผ่าน: อัปเดต `credential.counter`, ลบ cookie, คืนชื่อ-นามสกุล-เบอร์โทร
6. Client แสดงหน้า "เข้าสู่ระบบสำเร็จ" พร้อมข้อมูลผู้ใช้
7. หากยกเลิก prompt, หมดเวลา, หรือยืนยันไม่ผ่าน → แสดง error banner ที่ระบุสาเหตุชัดเจน

## 5. หน้าจอที่ต้องมี (Screens)
Implement เป็นหน้าเดียว (`app/page.js`) สลับ view ด้วย tab/state แทนการแยกหลายหน้า:
1. แท็บ Register (ฟอร์ม 4 ช่อง + ปุ่ม "สมัครสมาชิกด้วย FIDO2")
2. แท็บ Login (ช่อง username + ปุ่ม "เข้าสู่ระบบด้วย FIDO2")
3. หน้า Success (แสดงชื่อ-นามสกุล-เบอร์โทรหลัง login สำเร็จ + ปุ่มออกจากระบบ)
4. Error banner ด้านบนฟอร์ม แสดงระหว่างรอ/หลัง WebAuthn prompt ล้มเหลว
   (แยกข้อความตามสาเหตุ เช่น ยกเลิก prompt, credential ซ้ำ, หมดเวลา)

## 6. Deliverables ที่ต้องส่ง
1. URL ของ WebApp ที่ deploy จริง (https)
2. ลิงก์ GitHub repository ของ source code
3. ไฟล์ PDF สรุป AI Prompts Log ที่ใช้กับ Google AI Studio

## 7. เกณฑ์คะแนน (รวม 100)
| หัวข้อ | คะแนน |
|---|---|
| UI และฟอร์มข้อมูลครบถ้วน | 20 |
| FIDO2 Registration ทำงานได้จริง | 25 |
| FIDO2 Authentication ทำงานได้จริง | 25 |
| Deployment ขึ้น https จริง | 15 |
| AI Usage Documentation (Prompt Log) | 15 |

## 8. ข้อควรระวัง (Non-goals / Simplifications ที่เลือกใช้)
- ส่วน crypto verification (challenge/signature) **implement เต็มรูปแบบแล้ว**
  ผ่าน `@simplewebauthn/server` — ไม่ได้ใช้ทางลัดแบบเทียบ credential id เฉย ๆ
- ส่วนที่ยัง simplify ตามที่โจทย์อนุญาต: **storage เป็นไฟล์ JSON** แทนฐานข้อมูลจริง
  (เพียงพอสำหรับ demo แต่ไม่เหมาะกับ production หรือ multi-instance serverless ถาวร)
- ไม่ต้องรองรับ multi-device credential sync หรือหลาย credential ต่อ 1 ผู้ใช้
- ไม่มีระบบ session/login persistence (refresh หน้าแล้วต้อง login ใหม่) — เกินขอบเขตที่โจทย์กำหนด
