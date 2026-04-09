import mysql, { type Pool, type PoolOptions, type RowDataPacket } from "mysql2/promise";

let pool: Pool | null = null;

function getPoolConfig(): PoolOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "smart_farm",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: isProduction ? 3 : 10,
    queueLimit: 0,
    ...(isProduction
      ? { connectTimeout: 5_000, ssl: { rejectUnauthorized: false } }
      : { enableKeepAlive: true, keepAliveInitialDelay: 0, connectTimeout: 10_000 }),
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
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const [rows] = await getPool().execute<T>(sql, params);
      return rows;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isRetryable =
        code === "ECONNRESET" ||
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        code === "PROTOCOL_CONNECTION_LOST" ||
        code === "ER_CON_COUNT_ERROR";
      if (isRetryable && attempt < maxRetries) {
        // Destroy stale pool and retry with a fresh one
        if (pool) {
          try { await pool.end(); } catch { /* ignore */ }
          pool = null;
        }
        continue;
      }
      throw err;
    }
  }
  // unreachable but satisfies TS
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
