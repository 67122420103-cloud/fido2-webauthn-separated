# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# คัดลอก package files และติดตั้ง dependencies
COPY package*.json ./
RUN npm ci

# คัดลอกซอร์สโค้ดของ frontend ทั้งหมด
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# สร้าง public folder ว่างถ้ายังไม่มี (Next.js App Router ไม่บังคับต้องมี) เพื่อป้องกัน Docker build error
RUN mkdir -p /app/public

# ─── Stage 2: Runner (Production) ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# สร้าง non-root user เพื่อความปลอดภัย
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# คัดลอก artifacts จาก stage builder
# เมื่อสร้าง standalone ใน Docker, context ในการ build คือ /app (ไม่มี subfolder) 
# ดังนั้นไฟล์ server.js และโฟลเดอร์ต่าง ๆ จะอยู่ที่ root ของ standalone
COPY --from=builder /app/public             ./public
COPY --from=builder /app/.next/standalone  ./
COPY --from=builder /app/.next/static      ./.next/static

USER nextjs

EXPOSE 3000

# รัน server.js จาก root ของโปรเจกต์
CMD ["node", "server.js"]
