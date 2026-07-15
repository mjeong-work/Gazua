import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'The app will use mock data until these are configured.'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',          // use PKCE — tokens come back as ?code= to /auth/callback
      detectSessionInUrl: true,  // auto-exchange the code on the callback page
    },
  }
)

// ── Shared result type used by all service functions ─────────────
export type ServiceResult<T> = {
  data: T | null
  error: string | null
}

// ── Auth helpers ─────────────────────────────────────────────────

/** Returns the currently authenticated user's ID, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Returns the currently authenticated user's session, or null. */
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
