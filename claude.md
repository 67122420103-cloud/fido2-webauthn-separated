# รายงานการพัฒนาโดยใช้ AI-Assisted Development (Refactoring to Decoupled Architecture)

**วิชา:** การยืนยันตัวตนและความมั่นคงปลอดภัยทางคอมพิวเตอร์ (FIDO2 / WebAuthn Project)  
**หัวข้อ:** การแยกส่วนสถาปัตยกรรม (Frontend & Backend Separation) โดยใช้ AI Assistant  
**ผู้พัฒนา:** [ชื่อ-นามสกุลของผู้เรียน]  
**AI Assistant:** Claude / Gemini (Advanced Agentic Coding Assistant)

---

## 1. ภาพรวมและเหตุผลในการแยกส่วน (Architecture Overview)

ในเวอร์ชันก่อนหน้านี้ ระบบ FIDO2 / WebAuthn ถูกพัฒนาในรูปแบบ Next.js Monolith (มีทังหน้าจอ UI และ API Routes ร่วมกันในโปรเจกต์เดียว) ซึ่งแม้จะง่ายต่อการเริ่มต้นพัฒนา แต่ไม่สะท้อนโครงสร้างระบบขนาดใหญ่ในงานจริงที่มีการแยก Frontend ออกเป็น Single Page Application (SPA) และ Backend เป็น API Microservice หรือ Express Server

**เป้าหมายการปรับปรุงครั้งนี้:**
1.  แยกส่วนของหน้าจอเว็บ (Frontend) ไปใช้ Next.js Client-Side Only (Port 3000)
2.  แยกส่วนตรรกะระบบและการจัดการข้อมูลผู้ใช้ (Backend) ไปเป็น Node.js + Express.js Server (Port 5000)
3.  ใช้ Docker Compose ในการจัดการรันทั้ง 2 Services ควบคู่กันไปแบบแยก Container

---

## 2. ประวัติการสนทนาและการทำ AI-Assisted Development

### 💬 Prompt 1: คำสั่งเริ่มต้นเพื่อสั่งแยกสถาปัตยกรรม
> **ผู้เรียน:**
> "แยก frontend backend ให้หน่อยย"

#### 🤖 การวิเคราะห์และการตัดสินใจของ AI:
1.  **การวิเคราะห์โครงสร้างเดิม:** พบว่าหน้า UI ของเดิมใช้ React (Next.js App Router) ใน `app/page.js` และมี API Routes อยู่ใน `app/api/...`
2.  **การวางแผนโครงสร้างใหม่:** ตัดสินใจสร้างโฟลเดอร์ `/backend` และ `/frontend` แยกกันที่ Root
3.  **ปัญหาด้านเทคนิคที่เล็งเห็นล่วงหน้า (และแจ้งเตือนผู้เรียน):**
    *   **Cross-Origin Cookies:** เนื่องจาก Frontend (3000) และ Backend (5000) รันคนละ Origin ทำให้ Cookie ที่ใช้เก็บ pending challenge ในขั้นตอน FIDO2 Ceremony จะไม่ถูกส่งไปตามปกติ
    *   **Dynamic rpID & origin:** ตัวตรวจสอบฝั่ง Server (`@simplewebauthn/server`) จะต้องตรวจเทียบ origin ของหน้าเว็บ แต่เดิมใช้ request host ตรง ๆ ซึ่งถ้ารันคนละพอร์ต ตัวแปรนี้จะผิดพลาด ต้องเปลี่ยนไปดึงค่าจาก `Origin` หรือ `Referer` Header แทน

---

### 💬 Prompt 2: การพัฒนาส่วน API Server (Express.js Backend)

#### 🤖 สิ่งที่ AI ดำเนินการและแนะนำ:
1.  **สร้าง `backend/package.json`:** เพื่อกำหนด dependencies เฉพาะที่ backend ต้องใช้ (เช่น `@simplewebauthn/server`, `express`, `cors`, `cookie-parser`)
2.  **เขียนไฟล์ `backend/server.js`:**
    *   สร้าง Express app และเปิด CORS ให้สามารถส่ง Cookie ข้าม Origin ได้โดยเปิด `credentials: true` และระบุ Origin ไดนามิกกลับไป
    *   ใช้ `cookie-parser` สำหรับอ่าน/เขียนคุกกี้ที่เก็บ challenge
    *   พัฒนาฟังก์ชันคำนวณ `rpID` และ `origin` เพื่อแก้ไขโดเมนไม่ตรงกัน:
        ```javascript
        function getRpConfig(req) {
          let origin = req.headers.origin;
          if (!origin && req.headers.referer) {
            try {
              const url = new URL(req.headers.referer);
              origin = url.origin;
            } catch {}
          }
          if (!origin) origin = 'http://localhost:3000'; // fallback
          
          let rpID = 'localhost';
          try {
            const url = new URL(origin);
            rpID = url.hostname;
          } catch {}
          return { rpID, origin };
        }
        ```
    *   เขียนฟังก์ชัน Cookie Option ให้รองรับการทดสอบในเครื่องและการใช้งานบน Production:
        ```javascript
        res.cookie('fido2_pending_reg', JSON.stringify(pendingData), {
          httpOnly: true,
          secure: isHttps,
          sameSite: isHttps ? 'none' : 'lax', // lax บน localhost, none บน cross-site https
          maxAge: 300 * 1000,
          path: '/'
        });
        ```

---

### 💬 Prompt 3: การพัฒนาส่วน Client (Next.js Frontend)

#### 🤖 สิ่งที่ AI ดำเนินการและแนะนำ:
1.  **สร้าง `frontend/package.json`:** ถอด `@simplewebauthn/server` ออก เหลือเพียง `@simplewebauthn/browser` และ Next.js Core
2.  **ปรับปรุงหน้าจอ `frontend/app/page.js`:**
    *   ตั้งตัวแปร `API_BASE` เพื่อชี้พิกัดไปที่เซิร์ฟเวอร์ Backend (`process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'`)
    *   อัปเดตคำสั่ง `fetch()` ทุกตัวให้ยิงไปที่ `API_BASE` และส่ง Option `{ credentials: 'include' }` สำหรับการแนบคุกกี้ข้ามพอร์ต:
        ```javascript
        const optRes = await fetch(`${API_BASE}/api/register/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
          credentials: 'include', // ส่งและรับ cookies ข้าม origin
        });
        ```

---

### 💬 Prompt 4: การจัดตั้งระบบ Docker Orchestration และ Cleanup

#### 🤖 สิ่งที่ AI ดำเนินการและแนะนำ:
1.  **เขียน `docker-compose.yml` ใหม่:**
    *   สร้าง Service `backend` ให้แมป Port `5000:5000` และต่อ Persistent Volume `webauth-data` ไปที่โฟลเดอร์สำหรับเซฟ `users.json`
    *   สร้าง Service `frontend` ให้แมป Port `3000:3000` และส่ง Environment Variable `NEXT_PUBLIC_API_URL=http://localhost:5000`
2.  **แก้ไข `.gitignore` และ `.dockerignore`:** เพื่อคัดแยกไม่ให้ build context ของ Docker หนักเกินไป และป้องกันการ push `node_modules` ของแต่ละฝั่งขึ้น GitHub
3.  **ลบไฟล์ Monolith เก่าที่ระดับ Root:** ลบโฟลเดอร์ `app`, `lib`, `data` และ Dockerfile เก่าออกเพื่อจัดโครงสร้างให้เป็นระเบียบร้อย

---

## 3. สรุปบทเรียนที่ได้รับจากการ Refactoring ร่วมกับ AI

1.  **เข้าใจกลไกความปลอดภัยของเบราว์เซอร์ (Cross-Origin Resource Sharing & Cookie Security):** ได้เรียนรู้วิธีการกำหนดค่า SameSite, Secure flags ของ Cookie เมื่อจำเป็นต้องรับส่งข้าม Domain
2.  **ความสำคัญของ Relying Party ID (rpID) ใน WebAuthn:** ทำให้เข้าใจลึกซึ้งว่า FIDO2 ผูกความปลอดภัยไว้กับ Origin โดเมนที่เปิดใช้งาน หากมีการทำสถาปัตยกรรมแยกพอร์ต (พอร์ตเว็บ 3000 พอร์ต API 5000) ฝั่ง API จะต้องคำนวณ `rpID` จากโดเมนของหน้าเว็บที่เรียกใช้ ไม่ใช่โดเมนของเซิร์ฟเวอร์ backend ตัวเอง
3.  **การแยกภาระงานด้วย Docker Compose:** การผูก Volume ไปที่ backend เท่านั้น (เพราะเก็บข้อมูลผู้ใช้ไว้ที่นั่น) ช่วยให้ระบบทำงานได้อย่างต่อเนื่อง แม้ตู้ Container ตัวอื่น ๆ จะมีการ rebuild ใหม่ก็ตาม
