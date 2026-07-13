# คู่มือการ Deploy ระบบ FIDO2 / WebAuthn (Hybrid Setup: Vercel + Render)

คู่มือนี้แนะนำวิธีการติดตั้งเว็บแอปพลิเคชันระบบยืนยันตัวตนไร้รหัสผ่าน FIDO2/WebAuthn เข้าสู่ระบบอินเทอร์เน็ตสาธารณะ (Public HTTPS) โดยการแยกส่วน:
1.  **Backend (Express.js API)** ไปที่ **Render.com** (ฟรี + มี Disk เก็บข้อมูลยูสเซอร์ถาวร)
2.  **Frontend (Next.js Client)** ไปที่ **Vercel.com** (ฟรี + โหลดหน้าจอเร็ว)

---

## ขั้นที่ 1: นำโค้ดขึ้น GitHub
1.  สร้าง Repository ใหม่บน GitHub
2.  สั่งอัปโหลดโค้ดทั้งหมดในโปรเจกต์นี้ขึ้น GitHub ไปยัง Main Branch

---

## ขั้นที่ 2: Deploy Backend ไปที่ Render.com
1.  เข้าสู่ระบบ [Render.com](https://render.com)
2.  กดปุ่ม **New +** ที่มุมขวาบน -> เลือก **Blueprint**
3.  เลือกเชื่อมต่อกับ GitHub Repository ของโปรเจกต์นี้
4.  Render จะตรวจพบไฟล์ `render.yaml` และตั้งค่าความต้องการระบบให้โดยอัตโนมัติ 
5.  กดปุ่ม **Approve** เพื่อสั่งสร้างบริการ **`fido2-webauthn-backend`**
6.  รอประมาณ 2-3 นาทีจนระบบสร้างสำเร็จ คุณจะได้ลิงก์ API หลังบ้าน เช่น:
    `https://fido2-webauthn-backend-xxxx.onrender.com`
    **(ให้คัดลอกลิงก์นี้เก็บไว้เพื่อไปใช้งานใน Vercel)**

---

## ขั้นที่ 3: Deploy Frontend ไปที่ Vercel.com
1.  เข้าสู่ระบบ [Vercel.com](https://vercel.com)
2.  กดปุ่ม **Add New...** -> เลือก **Project**
3.  เลือกเชื่อมต่อกับ GitHub Repository เดียวกัน
4.  ในหน้าตั้งค่าโปรเจกต์ (Configure Project) ให้คลิกตั้งค่าดังนี้:
    *   📂 **Root Directory:** ให้กด **Edit** แล้วเลือกโฟลเดอร์ **`frontend`** (สำคัญมาก! เพื่อบังคับให้สร้างเฉพาะ Next.js UI)
    *   ⚙️ **Build and Development Settings:** ปล่อยตามค่าเริ่มต้น (Next.js)
    *   🔑 **Environment Variables:** ให้กรอกค่าตัวแปรเพื่อชี้หา backend ดังนี้:
        *   **Name:** `NEXT_PUBLIC_API_URL`
        *   **Value:** `https://fido2-webauthn-backend-xxxx.onrender.com` (วางลิงก์ที่ได้จากขั้นตอนของ Render ด้านบน)
5.  กดปุ่ม **Deploy**
6.  รอระบบสร้างเสร็จสิ้น คุณจะได้ลิงก์หน้าเว็บสาธารณะ เช่น `https://webauth-frontend-xxxx.vercel.app`

---

## ขั้นที่ 4: การเปิดทดลองใช้งานจริง
*   เข้าใช้งานผ่านโดเมนของ Vercel (`https://webauth-frontend-xxxx.vercel.app`)
*   ทดสอบระบบการสมัครสมาชิก (Register) และเข้าสู่ระบบ (Login)
*   อุปกรณ์ของคุณจะเรียกสแกนลายนิ้วมือ/ใบหน้า (Touch ID / Face ID / Windows Hello) และสร้างรหัสผ่าน FIDO2 เชื่อมโยงเข้ากับระบบหลังบ้านอย่างสมบูรณ์แบบ
