import { createClient } from "@supabase/supabase-js";

export async function getUserIdFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!token || !supabaseUrl || !publishableKey) return null;

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user.id;
}
