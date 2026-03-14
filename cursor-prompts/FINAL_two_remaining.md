# Only 2 things left — both Sonnet 4

## Prompt A: Admin layout server-side redirect (missing file)
Use Sonnet 4. Paste this:

```
The admin page is protected by middleware (src/lib/supabase/middleware.ts
checks role and redirects non-admins). But there's no server component
guard — if middleware is bypassed (e.g. direct server render), the admin
page shell still renders.

Create src/app/(app)/admin/layout.tsx:

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}

This is a belt-and-suspenders guard on top of the existing middleware check.
One file, no other changes needed.
```

## Prompt B: Verify build compiles (Sonnet 4)

```
Run `npm run build` in the project root. If there are TypeScript errors,
fix them. List every error and fix applied. Do not change any business
logic — only fix type errors, missing imports, or unused variables.
```

## That's it
After these two, the codebase is ready for doctor testing.
No more Cursor prompts needed.
