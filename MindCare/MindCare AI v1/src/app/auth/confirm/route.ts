import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return redirect("/auth/signin?error=invalid_code");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/dashboard");
}
