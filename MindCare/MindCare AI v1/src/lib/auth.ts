import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pg from "pg";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const pool = new pg.Pool({
          connectionString:
            process.env.LOCAL_DATABASE_URL ||
            "postgresql://bot@localhost:5432/mindcare",
        });

        try {
          const { rows } = await pool.query(
            "SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1",
            [credentials.email]
          );

          if (rows.length === 0) return null;

          const user = rows[0];
          const valid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        } finally {
          await pool.end();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
