import { NextRequest, NextResponse } from "next/server";
import pg from "pg";

/**
 * POST /api/db — Browser-side database proxy.
 * Receives Supabase-compatible query descriptors and executes them on local PostgreSQL.
 */

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

// Allowlist of tables that can be queried
const ALLOWED_TABLES = new Set([
  "users", "patients", "consultations", "transcripts",
  "clinical_notes", "note_templates", "audit_log",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, op, columns, filters = [], order = [], limit, offset, single, countExact, head, data } = body;

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ data: null, error: { message: "Table not allowed" } }, { status: 400 });
    }

    const pool = getPool();

    // Build WHERE clause
    const parts: string[] = [];
    const values: unknown[] = [];
    let idx = 0;

    for (const f of filters) {
      if (f.op === "IN") {
        if (!f.val || f.val.length === 0) {
          parts.push("FALSE");
        } else {
          const placeholders = (f.val as unknown[]).map(() => `$${++idx}`);
          parts.push(`"${f.col}" IN (${placeholders.join(",")})`);
          values.push(...f.val);
        }
      } else if (f.op === "OR") {
        // Parse Supabase or() syntax: "col.op.val,col.op.val"
        const orConditions: string[] = [];
        const orParts = (f.val as string).split(",");
        for (const p of orParts) {
          const m = p.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|is)\.(.+)$/);
          if (m) {
            const [, col, op, val] = m;
            const sqlOp = op === "eq" ? "=" : op === "neq" ? "!=" : op === "gt" ? ">" : op === "gte" ? ">=" :
              op === "lt" ? "<" : op === "lte" ? "<=" : op === "like" ? "LIKE" : op === "ilike" ? "ILIKE" : "IS";
            if (op === "is" && val === "null") {
              orConditions.push(`"${col}" IS NULL`);
            } else {
              orConditions.push(`"${col}" ${sqlOp} $${++idx}`);
              values.push(val);
            }
          }
        }
        if (orConditions.length > 0) parts.push(`(${orConditions.join(" OR ")})`);
      } else {
        parts.push(`"${f.col}" ${f.op} $${++idx}`);
        values.push(f.val);
      }
    }

    const whereClause = parts.length > 0 ? "WHERE " + parts.join(" AND ") : "";
    const orderStr = order.length > 0
      ? "ORDER BY " + order.map((o: { col: string; asc: boolean }) => `"${o.col}" ${o.asc ? "ASC" : "DESC"}`).join(", ")
      : "";
    const limitStr = limit != null ? `LIMIT ${limit}` : "";
    const offsetStr = offset != null ? `OFFSET ${offset}` : "";

    if (op === "select") {
      if (countExact && head) {
        const sql = `SELECT COUNT(*) as count FROM "${table}" ${whereClause}`;
        const res = await pool.query(sql, values);
        return NextResponse.json({ data: null, error: null, count: parseInt(res.rows[0]?.count || "0") });
      }

      const cols = !columns || columns === "*" ? "*" : columns.split(",").map((c: string) => `"${c.trim()}"`).join(", ");
      // Count query if needed
      let count: number | undefined;
      if (countExact && !head) {
        const countSql = `SELECT COUNT(*) as count FROM "${table}" ${whereClause}`;
        const countRes = await pool.query(countSql, values);
        count = parseInt(countRes.rows[0]?.count || "0");
      }

      const sql = `SELECT ${cols} FROM "${table}" ${whereClause} ${orderStr} ${limitStr} ${offsetStr}`;
      const res = await pool.query(sql, values);

      if (single) {
        if (res.rows.length === 0) {
          return NextResponse.json({ data: null, error: { message: "No rows found", code: "PGRST116" } });
        }
        return NextResponse.json({ data: res.rows[0], error: null });
      }

      return NextResponse.json({ data: res.rows, error: null, count });
    }

    if (op === "insert" && data) {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return NextResponse.json({ data: [], error: null });

      const allKeys = [...new Set(rows.flatMap((r: Record<string, unknown>) => Object.keys(r)))];
      const colsList = allKeys.map(k => `"${k}"`).join(", ");
      const allValues: unknown[] = [];
      const rowPlaceholders = rows.map((row: Record<string, unknown>) => {
        const ph = allKeys.map(k => {
          const v = row[k];
          allValues.push(v !== undefined ? (typeof v === "object" && v !== null ? JSON.stringify(v) : v) : null);
          return `$${allValues.length}`;
        });
        return `(${ph.join(", ")})`;
      });

      const sql = `INSERT INTO "${table}" (${colsList}) VALUES ${rowPlaceholders.join(", ")} RETURNING *`;
      const res = await pool.query(sql, allValues);
      return NextResponse.json({ data: res.rows, error: null });
    }

    if (op === "update" && data) {
      const keys = Object.keys(data);
      const setClauses: string[] = [];
      const setValues: unknown[] = [];
      let setIdx = 0;

      for (const k of keys) {
        const v = data[k];
        setValues.push(typeof v === "object" && v !== null ? JSON.stringify(v) : v);
        setClauses.push(`"${k}" = $${++setIdx}`);
      }

      // Rebuild WHERE with offset
      const wParts: string[] = [];
      let wIdx = setIdx;
      for (const f of filters) {
        if (f.op === "IN") {
          if (!f.val?.length) { wParts.push("FALSE"); }
          else {
            const ph = (f.val as unknown[]).map(() => `$${++wIdx}`);
            wParts.push(`"${f.col}" IN (${ph.join(",")})`);
            setValues.push(...f.val);
          }
        } else if (f.op === "OR") {
          wParts.push(`(${f.val})`);
        } else {
          wParts.push(`"${f.col}" ${f.op} $${++wIdx}`);
          setValues.push(f.val);
        }
      }

      const wClause = wParts.length > 0 ? "WHERE " + wParts.join(" AND ") : "";
      const sql = `UPDATE "${table}" SET ${setClauses.join(", ")} ${wClause} RETURNING *`;
      const res = await pool.query(sql, setValues);

      if (single) return NextResponse.json({ data: res.rows[0] || null, error: null });
      return NextResponse.json({ data: res.rows, error: null });
    }

    if (op === "delete") {
      const sql = `DELETE FROM "${table}" ${whereClause} RETURNING *`;
      const res = await pool.query(sql, values);
      return NextResponse.json({ data: res.rows, error: null });
    }

    return NextResponse.json({ data: null, error: { message: "Unknown operation" } }, { status: 400 });
  } catch (err) {
    console.error("[/api/db]", err);
    return NextResponse.json({ data: null, error: { message: err instanceof Error ? err.message : "DB error" } }, { status: 500 });
  }
}
