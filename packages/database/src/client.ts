// Client Supabase partagé

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper pour vérifier l'authentification
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Helper pour vérifier le rôle
export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select('role, tenant_id, shop_id')
    .eq('id', user.id)
    .single();
  
  if (error) throw error;
  return data;
}

// Helper pour vérifier si l'utilisateur est super admin
export async function isSuperAdmin() {
  const role = await getUserRole();
  return role?.role === 'super_admin';
}

// Helper pour récupérer le tenant_id
export async function getTenantId() {
  const role = await getUserRole();
  return role?.tenant_id;
}

// Helper pour vérifier le statut de l'abonnement
export async function getSubscriptionStatus() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;
  
  const { data, error } = await supabase
    .from('establishments')
    .select('subscription_status, subscription_expires_at')
    .eq('id', tenantId)
    .single();
  
  if (error) throw error;
  return data;
}
