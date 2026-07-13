import './globals.css'

export const metadata = {
  title: 'FIDO2 WebAuthn Demo | Passwordless Authentication',
  description: 'ระบบยืนยันตัวตนไร้รหัสผ่านด้วยมาตรฐาน FIDO2 / WebAuthn รองรับ Biometric และ Security Key',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
