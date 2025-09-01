import mysql from 'mysql2/promise';
//import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    console.log("✅ Conexión a MySQL establecida!");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión MySQL:", err);
  });

//export default pool;
