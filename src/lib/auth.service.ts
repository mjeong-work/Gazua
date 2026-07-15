import { supabase } from './supabase'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export type AuthResult<T = void> = {
  data: T | null
  error: string | null
}

// ── signUpWithEmail ──────────────────────────────────────────────
/**
 * Create a new account with email + password.
 * With email confirmation OFF the user is immediately signed in.
 * The handle_new_user() DB trigger fires automatically to create the profiles row.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, name: fullName },
    },
  })

  if (error) return { data: null, error: mapAuthError(error.message) }
  return { data: { user: data.user, session: data.session }, error: null }
}

// ── signInWithEmail ──────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { data: null, error: mapAuthError(error.message) }
  return { data: { user: data.user, session: data.session }, error: null }
}

// ── signInWithGoogle ─────────────────────────────────────────────
/**
 * Initiates the Google OAuth redirect flow.
 * Supabase redirects to /auth/callback after the user consents.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── signOut ──────────────────────────────────────────────────────
export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut()
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── getCurrentUser ───────────────────────────────────────────────
export async function getCurrentUser(): Promise<AuthResult<User>> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return { data: null, error: error.message }
  return { data: data.user, error: null }
}

// ── resetPasswordForEmail ────────────────────────────────────────
export async function resetPasswordForEmail(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── onAuthStateChange ────────────────────────────────────────────
/** Thin wrapper so callers don't need to import supabase directly. */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}

// ── mapAuthError ─────────────────────────────────────────────────
/** Converts raw Supabase error strings to user-facing messages. */
function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (m.includes('password should be at least') || m.includes('password is too short')) {
    return 'Password must be at least 6 characters.'
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Please enter a valid email address.'
  }
  if (m.includes('email rate limit') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return message
}
