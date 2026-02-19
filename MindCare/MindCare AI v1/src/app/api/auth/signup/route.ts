import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const pool = new pg.Pool({
      connectionString: process.env.LOCAL_DATABASE_URL || "postgresql://bot@localhost:5432/mindcare",
    });

    try {
      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      const hash = await bcrypt.hash(password, 12);
      const id = randomUUID();

      await pool.query(
        "INSERT INTO users (id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)",
        [id, email, hash, name, "clinician"]
      );

      return NextResponse.json({ success: true });
    } finally {
      await pool.end();
    }
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
