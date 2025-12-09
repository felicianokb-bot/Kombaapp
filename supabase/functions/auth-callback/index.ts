import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const redirectTo = url.searchParams.get("redirect_to") || "http://localhost:3000/"

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const errUrl = new URL(redirectTo)
      errUrl.searchParams.set("auth_error", "Missing SUPABASE_URL/SUPABASE_ANON_KEY")
      return Response.redirect(errUrl.toString(), 303)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { "x-forwarded-host": req.headers.get("host") ?? "" } }
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(req)
    if (error) {
      const errUrl = new URL(redirectTo)
      errUrl.searchParams.set("auth_error", error.message || "auth exchange failed")
      return Response.redirect(errUrl.toString(), 303)
    }

    if (data.session) {
      const redirectUrl = new URL(redirectTo)
      // Anexa os tokens de sessão ao fragmento de hash para que o supabase-js possa lê-los
      redirectUrl.hash = `access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`
      return Response.redirect(redirectUrl.toString(), 303)
    }

    // Fallback caso a sessão não esteja presente
    const fallbackErrorUrl = new URL(redirectTo)
    fallbackErrorUrl.searchParams.set("auth_error", "Session not found after successful code exchange.")
    return Response.redirect(fallbackErrorUrl.toString(), 303)
  } catch (e) {
    try {
      const fallback = new URL("http://localhost:3000/")
      fallback.searchParams.set("auth_error", e?.message || String(e))
      return Response.redirect(fallback.toString(), 303)
    } catch {
      return new Response("auth-callback error", { status: 500 })
    }
  }
})

