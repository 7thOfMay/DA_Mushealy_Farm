import mysql, { type Pool, type PoolOptions, type RowDataPacket } from "mysql2/promise";

let pool: Pool | null = null;

function getPoolConfig(): PoolOptions {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "smart_farm",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(getPoolConfig());
  }
  return pool;
}

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, params);
  return rows;
}

export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

export function isDbConfigured(): boolean {
  return !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}
