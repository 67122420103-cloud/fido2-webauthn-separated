FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# สร้าง non-root user เพื่อความปลอดภัย
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 expressjs

# คัดลอก package files และติดตั้งเฉพาะ production dependencies
COPY package*.json ./
RUN npm ci --only=production

# คัดลอกซอร์สโค้ดของ backend
COPY . .

# สร้างโฟลเดอร์สำหรับ users.json และเปลี่ยนสิทธิ์การเข้าถึงให้เป็นของ user expressjs
RUN mkdir -p /app/data && chown -R expressjs:nodejs /app/data

VOLUME ["/app/data"]

USER expressjs

EXPOSE 5000

CMD ["node", "server.js"]
