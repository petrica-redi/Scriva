/**
 * Supabase-compatible PostgreSQL adapter.
 * Drop-in replacement for @supabase/supabase-js client.
 */
import pg from "pg";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString: process.env.LOCAL_DATABASE_URL || "postgresql://bot@localhost:5432/mindcare",
      max: 10,
    });
  }
  return _pool;
}

const DEMO_SESSION = {
  access_token: "demo-token",
  refresh_token: "demo-refresh",
  expires_in: 86400,
  token_type: "bearer",
  user: { id: DEMO_USER_ID, email: "demo@mindcare-ai.com" },
};

const authMock = {
  getUser: async () => ({
    data: { user: { id: DEMO_USER_ID, email: "demo@mindcare-ai.com" } },
    error: null,
  }),
  getSession: async () => ({
    data: { session: DEMO_SESSION },
    error: null,
  }),
  signUp: async () => ({ data: {}, error: null }),
  signInWithPassword: async () => ({
    data: { user: { id: DEMO_USER_ID }, session: DEMO_SESSION },
    error: null,
  }),
  signOut: async () => ({ error: null }),
};

type FilterOp = { col: string; op: string; val: unknown };

class QueryBuilder {
  private table: string;
  private _op: "select" | "insert" | "update" | "delete" = "select";
  private _columns = "*";
  private _filters: FilterOp[] = [];
  private _orFilters: string[] = [];
  private _orderClauses: { col: string; asc: boolean }[] = [];
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _isSingle = false;
  private _isCount = false;
  private _isHead = false;
  private _insertData: Record<string, unknown>[] | null = null;
  private _updateData: Record<string, unknown> | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }): this {
    if (this._op === "insert" || this._op === "update" || this._op === "delete") {
      // .select() after mutation = return data (already handled via RETURNING *)
      return this;
    }
    this._op = "select";
    this._columns = cols || "*";
    if (opts?.count === "exact") this._isCount = true;
    if (opts?.head) this._isHead = true;
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this._op = "insert";
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: Record<string, unknown>): this {
    this._op = "update";
    this._updateData = data;
    return this;
  }

  delete(): this {
    this._op = "delete";
    return this;
  }

  eq(col: string, val: unknown): this { this._filters.push({ col, op: "=", val }); return this; }
  neq(col: string, val: unknown): this { this._filters.push({ col, op: "!=", val }); return this; }
  gt(col: string, val: unknown): this { this._filters.push({ col, op: ">", val }); return this; }
  gte(col: string, val: unknown): this { this._filters.push({ col, op: ">=", val }); return this; }
  lt(col: string, val: unknown): this { this._filters.push({ col, op: "<", val }); return this; }
  lte(col: string, val: unknown): this { this._filters.push({ col, op: "<=", val }); return this; }
  like(col: string, val: string): this { this._filters.push({ col, op: "LIKE", val }); return this; }
  ilike(col: string, val: string): this { this._filters.push({ col, op: "ILIKE", val }); return this; }

  in(col: string, vals: unknown[]): this {
    if (vals.length === 0) {
      this._filters.push({ col, op: "IN_EMPTY", val: null });
    } else {
      this._filters.push({ col, op: "IN", val: vals });
    }
    return this;
  }

  or(orExpr: string): this {
    // Parse Supabase or() syntax: "col1.op.val,col2.op.val"
    this._orFilters.push(orExpr);
    return this;
  }

  textSearch(col: string, query: string, _opts?: { type?: string }): this {
    // Convert Supabase textSearch to PostgreSQL ILIKE fallback
    // (full-text search would need tsvector columns; use ILIKE as pragmatic alternative)
    this._filters.push({ col, op: "ILIKE", val: `%${query}%` });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this._orderClauses.push({ col, asc: opts?.ascending ?? true });
    return this;
  }

  limit(n: number): this { this._limitVal = n; return this; }

  range(from: number, to: number): this {
    this._offsetVal = from;
    this._limitVal = to - from + 1;
    return this;
  }

  single(): this {
    this._isSingle = true;
    this._limitVal = 1;
    return this;
  }

  private buildWhere(paramOffset = 0): { clause: string; values: unknown[] } {
    const parts: string[] = [];
    const values: unknown[] = [];
    let idx = paramOffset;

    for (const f of this._filters) {
      if (f.op === "IN_EMPTY") {
        parts.push("FALSE");
      } else if (f.op === "IN") {
        const arr = f.val as unknown[];
        const placeholders = arr.map(() => `$${++idx}`);
        parts.push(`"${f.col}" IN (${placeholders.join(",")})`);
        values.push(...arr);
      } else {
        parts.push(`"${f.col}" ${f.op} $${++idx}`);
        values.push(f.val);
      }
    }

    // Parse or() expressions
    for (const orExpr of this._orFilters) {
      const orParts = this.parseOrExpression(orExpr, idx, values);
      if (orParts.sql) {
        parts.push(`(${orParts.sql})`);
        idx = orParts.idx;
      }
    }

    return {
      clause: parts.length > 0 ? "WHERE " + parts.join(" AND ") : "",
      values,
    };
  }

  private parseOrExpression(expr: string, startIdx: number, values: unknown[]): { sql: string; idx: number } {
    // Parse: "full_name.ilike.%search%,mrn.ilike.%search%"
    let idx = startIdx;
    const conditions: string[] = [];

    // Split by comma, but be careful with values containing commas
    const parts = expr.split(",");
    for (const part of parts) {
      const match = part.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
      if (match) {
        const [, col, op, val] = match;
        const sqlOp = op === "eq" ? "=" : op === "neq" ? "!=" : op === "gt" ? ">" : op === "gte" ? ">=" :
          op === "lt" ? "<" : op === "lte" ? "<=" : op === "like" ? "LIKE" : op === "ilike" ? "ILIKE" : "IS";

        if (op === "is" && val === "null") {
          conditions.push(`"${col}" IS NULL`);
        } else {
          values.push(val);
          conditions.push(`"${col}" ${sqlOp} $${++idx}`);
        }
      }
    }

    return { sql: conditions.join(" OR "), idx };
  }

  async then(resolve: (val: unknown) => void, reject?: (err: unknown) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err, count: null });
    }
  }

  async execute(): Promise<{ data: unknown; error: unknown; count?: number | null }> {
    const pool = getPool();

    try {
      if (this._op === "select") {
        const { clause, values } = this.buildWhere();
        const orderStr = this._orderClauses.length > 0
          ? "ORDER BY " + this._orderClauses.map(o => `"${o.col}" ${o.asc ? "ASC" : "DESC"}`).join(", ")
          : "";
        const limitStr = this._limitVal != null ? `LIMIT ${this._limitVal}` : "";
        const offsetStr = this._offsetVal != null ? `OFFSET ${this._offsetVal}` : "";

        if (this._isCount && this._isHead) {
          const sql = `SELECT COUNT(*) as count FROM "${this.table}" ${clause}`;
          const res = await pool.query(sql, values);
          return { data: null, error: null, count: parseInt(res.rows[0]?.count || "0") };
        }

        // For count + data, we need two queries
        let count: number | null = null;
        if (this._isCount) {
          const countSql = `SELECT COUNT(*) as count FROM "${this.table}" ${clause}`;
          const countRes = await pool.query(countSql, values);
          count = parseInt(countRes.rows[0]?.count || "0");
        }

        const sql = `SELECT * FROM "${this.table}" ${clause} ${orderStr} ${limitStr} ${offsetStr}`;
        const res = await pool.query(sql, values);

        if (this._isSingle) {
          if (res.rows.length === 0) {
            return { data: null, error: { message: "No rows found", code: "PGRST116" } };
          }
          return { data: res.rows[0], error: null };
        }

        return { data: res.rows, error: null, count };
      }

      if (this._op === "insert" && this._insertData) {
        if (this._insertData.length === 0) return { data: [], error: null };

        const allKeys = [...new Set(this._insertData.flatMap(r => Object.keys(r)))];
        const colsList = allKeys.map(k => `"${k}"`).join(", ");
        const allValues: unknown[] = [];
        const rowPlaceholders = this._insertData.map(row => {
          const ph = allKeys.map(k => {
            const v = row[k];
            allValues.push(v !== undefined ? (typeof v === "object" && v !== null ? JSON.stringify(v) : v) : null);
            return `$${allValues.length}`;
          });
          return `(${ph.join(", ")})`;
        });

        const sql = `INSERT INTO "${this.table}" (${colsList}) VALUES ${rowPlaceholders.join(", ")} RETURNING *`;
        const res = await pool.query(sql, allValues);

        if (this._isSingle) return { data: res.rows[0] || null, error: null };
        return { data: res.rows, error: null };
      }

      if (this._op === "update" && this._updateData) {
        const keys = Object.keys(this._updateData);
        const setValues: unknown[] = [];
        let idx = 0;
        const setClauses = keys.map(k => {
          const v = this._updateData![k];
          setValues.push(typeof v === "object" && v !== null ? JSON.stringify(v) : v);
          return `"${k}" = $${++idx}`;
        });

        const { clause, values: whereValues } = this.buildWhere(idx);
        const sql = `UPDATE "${this.table}" SET ${setClauses.join(", ")} ${clause} RETURNING *`;
        const res = await pool.query(sql, [...setValues, ...whereValues]);

        if (this._isSingle) return { data: res.rows[0] || null, error: null };
        return { data: res.rows, error: null };
      }

      if (this._op === "delete") {
        const { clause, values } = this.buildWhere();
        const sql = `DELETE FROM "${this.table}" ${clause} RETURNING *`;
        const res = await pool.query(sql, values);
        return { data: res.rows, error: null };
      }

      return { data: null, error: { message: "Unknown operation" } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[pg-adapter] ${this._op} ${this.table}:`, msg);
      return { data: null, error: { message: msg, code: "PG_ERROR" } };
    }
  }
}

let _instance: ReturnType<typeof _createLocalClient> | null = null;

function _createLocalClient() {
  return {
    auth: authMock,
    from: (table: string) => new QueryBuilder(table),
  };
}

export function createLocalClient() {
  if (!_instance) _instance = _createLocalClient();
  return _instance;
}
