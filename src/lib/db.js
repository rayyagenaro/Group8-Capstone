// /lib/db.js
import mysql from 'mysql2/promise';

function buildMysqlConfig() {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USER ?? 'root';
  const database = process.env.DB_NAME ?? 'bione_db';

  // Ambil password apa adanya (bisa undefined / "")
  const rawPassword = process.env.DB_PASSWORD;

  // Base config tanpa password
  const cfg = {
    host,
    port,
    user,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: false,
  };

  // Hanya tambahkan field password kalau TIDAK kosong
  if (rawPassword !== undefined && rawPassword !== null && rawPassword !== '') {
    cfg.password = rawPassword;
  }

  // Opsional: dukung UNIX socket kalau kamu pakai MAMP/XAMPP di Mac/Linux
  // if (process.env.DB_SOCKET_PATH) cfg.socketPath = process.env.DB_SOCKET_PATH;

  return cfg;
}

function createPool() {
  return mysql.createPool(buildMysqlConfig());
}

const g = globalThis;
if (!g._mysqlPool) {
  g._mysqlPool = createPool();
  if (process.env.NODE_ENV !== 'production') {
    const hasPw = (process.env.DB_PASSWORD ?? '').length > 0;
    console.log('[DB] MySQL pool created', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER ?? 'root',
      passwordSent: hasPw, // false = tanpa password
      db: process.env.DB_NAME ?? 'bione_db',
    });
  }
}

const db = g._mysqlPool;
export default db;
