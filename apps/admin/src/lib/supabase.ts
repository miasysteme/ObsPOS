// Client Supabase initialisé avec les variables d'environnement de l'app Admin
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select('role, tenant_id, shop_id')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

// Helper pour vérifier si l'utilisateur est super admin
export async function isSuperAdmin() {
  try {
    const role = await getUserRole();
    return role?.role === 'super_admin';
  } catch (error) {
    console.error('Error in isSuperAdmin:', error);
    return false;
  }
}
