const fs = require('fs');
const path = require('path');

// ใช้ path จาก project root
const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

/**
 * อ่านข้อมูลผู้ใช้ทั้งหมดจาก users.json
 * @returns {Array} รายการผู้ใช้ทั้งหมด
 */
function readUsers() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * บันทึกข้อมูลผู้ใช้ทั้งหมดลง users.json
 * @param {Array} users - รายการผู้ใช้ทั้งหมด
 */
function writeUsers(users) {
  // สร้าง directory ถ้ายังไม่มี
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

/**
 * ค้นหาผู้ใช้ด้วย username (case-insensitive)
 * @param {string} username
 * @returns {Object|undefined}
 */
function findUserByUsername(username) {
  const users = readUsers();
  return users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
}

/**
 * เพิ่มผู้ใช้ใหม่
 * @param {Object} user
 */
function createUser(user) {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
}

/**
 * อัปเดตข้อมูล credential ของผู้ใช้ (เช่น counter หลัง login)
 * @param {string} username
 * @param {Object} updatedCredential
 */
function updateUserCredential(username, updatedCredential) {
  const users = readUsers();
  const idx = users.findIndex(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (idx !== -1) {
    users[idx].credential = updatedCredential;
    writeUsers(users);
  }
}

module.exports = {
  readUsers,
  writeUsers,
  findUserByUsername,
  createUser,
  updateUserCredential
};
