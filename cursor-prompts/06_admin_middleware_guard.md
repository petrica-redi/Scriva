# Prompt 6: Admin route-level guard in middleware

## Context
`/api/admin/users` has its own role check (good). But the `/admin` page itself (`src/app/(app)/admin/page.tsx`) can be loaded by ANY logged-in user. The page then fetches data via the API (which blocks non-admins), but the page shell still renders. This leaks the admin UI to non-admin users.

## Task
Add a server-side admin check so non-admin users get redirected before the page loads.

### Option A (preferred): Layout-level guard
Create or edit `src/app/(app)/admin/layout.tsx`:

```tsx
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

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
```

### Also
In the admin page component, add a client-side fallback for safety:
At the top of `AdminPanel()`, after `const supabase = createClient()`:

```ts
const [authorized, setAuthorized] = useState(false);
useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) { router.push("/auth/signin"); return; }
    supabase.from("users").select("role").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.role !== "admin") router.push("/dashboard");
        else setAuthorized(true);
      });
  });
}, []);

if (!authorized) return <div className="flex items-center justify-center h-screen">Checking access...</div>;
```

## Files to create/modify
- `src/app/(app)/admin/layout.tsx` (create)
- `src/app/(app)/admin/page.tsx` (add client-side fallback)
