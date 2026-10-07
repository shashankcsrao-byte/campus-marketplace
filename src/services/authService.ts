import { supabase } from '../lib/supabase';
import { appError } from '../utils/errorMessages';
import type { Profile } from '../types';

export async function signUp(name: string, campus: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), campus: campus.trim() || null } },
  });
  if (error) throw error;
  // With email confirmation ON, Supabase hides duplicate emails behind a user with no identities.
  if (data.user && data.user.identities?.length === 0) throw appError('user_already_exists');
  if (!data.session) throw appError('EMAIL_CONFIRMATION_REQUIRED');
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(id: string, fields: { name: string; campus: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name: fields.name.trim(), campus: fields.campus.trim() || null })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw appError('NOT_ALLOWED');
  return data as Profile;
}
