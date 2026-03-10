import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppRole = 'cemosa' | 'externo';
export type AuthSession = {
  provider: 'supabase';
  role: AppRole;
  displayName: string;
  email: string;
  userId: string;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const parseRoleValue = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'cemosa') return 'cemosa';
  if (normalized === 'externo') return 'externo';
  return null;
};

const resolveRole = (user: User): AppRole => {
  const roleFromMetadata =
    parseRoleValue(user.user_metadata?.role) ||
    parseRoleValue(user.user_metadata?.tipo) ||
    parseRoleValue(user.app_metadata?.role) ||
    parseRoleValue(user.app_metadata?.tipo);

  if (roleFromMetadata) return roleFromMetadata;

  const email = normalizeEmail(user.email || '');
  if (email.endsWith('@cemosa.es')) return 'cemosa';
  return 'externo';
};

const resolveDisplayName = (user: User): string => {
  const candidate =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.nombre ||
    user.email ||
    'Usuario';

  return String(candidate).trim() || 'Usuario';
};

const mapUserToSession = (user: User | null): AuthSession | null => {
  if (!user || !user.email) return null;

  return {
    provider: 'supabase',
    role: resolveRole(user),
    displayName: resolveDisplayName(user),
    email: normalizeEmail(user.email),
    userId: user.id
  };
};

export const getSupabaseSession = async (): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return mapUserToSession(data.session?.user ?? null);
};

export const loginWithEmailPassword = async (
  email: string,
  password: string
): Promise<{ session: AuthSession | null; error: string | null }> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { session: null, error: 'Debes indicar email y contraseña.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) {
    return { session: null, error: error.message };
  }

  return {
    session: mapUserToSession(data.user ?? data.session?.user ?? null),
    error: null
  };
};

export const logoutSupabase = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const onAuthStateChange = (
  callback: (session: AuthSession | null) => void
): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapUserToSession(session?.user ?? null));
  });

  return () => {
    data.subscription.unsubscribe();
  };
};
