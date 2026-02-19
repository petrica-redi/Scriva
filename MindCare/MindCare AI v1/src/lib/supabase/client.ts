/**
 * Browser-side Supabase-compatible client.
 * Routes all queries through /api/db proxy endpoint.
 */

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

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
  onAuthStateChange: (_event: string, _callback: unknown) => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
};

interface QueryOp {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  columns?: string;
  filters: { col: string; op: string; val: unknown }[];
  order?: { col: string; asc: boolean }[];
  limit?: number | null;
  offset?: number | null;
  single?: boolean;
  countExact?: boolean;
  head?: boolean;
  data?: unknown;
}

class BrowserQueryBuilder {
  private query: QueryOp;

  constructor(table: string) {
    this.query = { table, op: "select", filters: [], order: [] };
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    this.query.op = "select";
    this.query.columns = cols || "*";
    if (opts?.count === "exact") this.query.countExact = true;
    if (opts?.head) this.query.head = true;
    return this;
  }

  insert(data: unknown) { this.query.op = "insert"; this.query.data = data; return this; }
  update(data: unknown) { this.query.op = "update"; this.query.data = data; return this; }
  delete() { this.query.op = "delete"; return this; }

  eq(col: string, val: unknown) { this.query.filters.push({ col, op: "=", val }); return this; }
  neq(col: string, val: unknown) { this.query.filters.push({ col, op: "!=", val }); return this; }
  in(col: string, vals: unknown[]) { this.query.filters.push({ col, op: "IN", val: vals }); return this; }
  gte(col: string, val: unknown) { this.query.filters.push({ col, op: ">=", val }); return this; }
  lte(col: string, val: unknown) { this.query.filters.push({ col, op: "<=", val }); return this; }
  gt(col: string, val: unknown) { this.query.filters.push({ col, op: ">", val }); return this; }
  lt(col: string, val: unknown) { this.query.filters.push({ col, op: "<", val }); return this; }
  like(col: string, val: string) { this.query.filters.push({ col, op: "LIKE", val }); return this; }
  ilike(col: string, val: string) { this.query.filters.push({ col, op: "ILIKE", val }); return this; }
  or(expr: string) { this.query.filters.push({ col: "__or__", op: "OR", val: expr }); return this; }

  range(from: number, to: number) {
    this.query.offset = from;
    this.query.limit = to - from + 1;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.query.order!.push({ col, asc: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) { this.query.limit = n; return this; }

  single() { this.query.single = true; this.query.limit = 1; return this; }

  then<TResult1 = any, TResult2 = never>(
    resolve?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const promise = fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.query),
    })
      .then((res) => res.json())
      .catch((err) => ({ data: null, error: { message: String(err) }, count: null }));

    return promise.then(resolve, reject);
  }
}

// Singleton instance to avoid infinite re-render loops
// (useEffect deps see the same reference every time)
let _instance: ReturnType<typeof _createClient> | null = null;

function _createClient() {
  return {
    auth: authMock as any,
    from: (table: string): any => new BrowserQueryBuilder(table),
  };
}

export function createClient() {
  if (!_instance) _instance = _createClient();
  return _instance;
}
