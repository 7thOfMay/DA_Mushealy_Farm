import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPoolConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    connectionString: process.env.POSTGRES_URL ?? undefined,
    host: process.env.POSTGRES_HOST ?? process.env.DB_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? process.env.DB_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? process.env.DB_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    database: process.env.POSTGRES_DATABASE ?? process.env.DB_NAME ?? "smart_farm",
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: isProduction ? 5_000 : 10_000,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<T[]> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await getPool().query<T>(sql, params);
      return result.rows;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isRetryable =
        code === "ECONNRESET" ||
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        code === "57P01" || // admin_shutdown
        code === "57P03";   // cannot_connect_now
      if (isRetryable && attempt < maxRetries) {
        if (pool) {
          try { await pool.end(); } catch { /* ignore */ }
          pool = null;
        }
        continue;
      }
      throw err;
    }
  }
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export function isDbConfigured(): boolean {
  return !!(
    process.env.POSTGRES_URL ||
    (process.env.POSTGRES_HOST ?? process.env.DB_HOST) &&
    (process.env.POSTGRES_USER ?? process.env.DB_USER) &&
    (process.env.POSTGRES_DATABASE ?? process.env.DB_NAME)
  );
}
