import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'manager' | 'cashier';
  tenant_id: string | null;
  shop_id: string | null;
  is_active: boolean;
  created_at: string;
  establishment?: {
    name: string;
  };
  shop?: {
    name: string;
  };
}

interface Establishment {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
  tenant_id: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterEstablishment, setFilterEstablishment] = useState<string>('all');
  const [filterShop, setFilterShop] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Charger les utilisateurs avec leurs relations
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          establishment:establishments(name),
          shop:shops(name)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Charger les établissements
      const { data: establishmentsData, error: establishmentsError } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (establishmentsError) throw establishmentsError;

      // Charger les boutiques
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('id, name, tenant_id')
        .eq('is_active', true)
        .order('name');

      if (shopsError) throw shopsError;

      setUsers(usersData || []);
      setEstablishments(establishmentsData || []);
      setShops(shopsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setUsers(users.map(u =>
        u.id === id ? { ...u, is_active: !currentStatus } : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesEstablishment = filterEstablishment === 'all' || user.tenant_id === filterEstablishment;
    const matchesShop = filterShop === 'all' || user.shop_id === filterShop;

    return matchesSearch && matchesRole && matchesEstablishment && matchesShop;
  });

  const stats = {
    total: users.length,
    superAdmin: users.filter(u => u.role === 'super_admin').length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    cashier: users.filter(u => u.role === 'cashier').length,
    active: users.filter(u => u.is_active).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Utilisateurs</h1>
        <p className="text-gray-600">Gérez les utilisateurs et leurs rôles d'accès</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total"
          value={stats.total}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          title="Actifs"
          value={stats.active}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Administrateurs"
          value={stats.admin + stats.superAdmin}
          icon={Shield}
          color="purple"
        />
        <StatCard
          title="Caissiers"
          value={stats.cashier}
          icon={UsersIcon}
          color="orange"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les rôles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Caissier</option>
            </select>

            <select
              value={filterEstablishment}
              onChange={(e) => setFilterEstablishment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>

            <select
              value={filterShop}
              onChange={(e) => setFilterShop(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Toutes les boutiques</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 transition whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Ajouter un utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Établissement / Boutique
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterRole !== 'all' || filterEstablishment !== 'all'
                      ? 'Aucun utilisateur trouvé'
                      : 'Aucun utilisateur enregistré'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <UsersIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.establishment && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                          <Building2 className="w-4 h-4" />
                          {user.establishment.name}
                        </div>
                      )}
                      {user.shop && (
                        <div className="text-sm text-gray-500 ml-5">
                          {user.shop.name}
                        </div>
                      )}
                      {!user.establishment && !user.shop && (
                        <span className="text-sm text-gray-400">Non affecté</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          establishments={establishments}
          shops={shops}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            loadData();
            setShowAddModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    cashier: 'bg-green-100 text-green-800',
  };

  const labels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    cashier: 'Caissier',
  };

  const icons = {
    super_admin: Shield,
    admin: Key,
    manager: UsersIcon,
    cashier: UsersIcon,
  };

  const Icon = icons[role as keyof typeof icons];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${styles[role as keyof typeof styles]}`}>
      <Icon className="w-3 h-3" />
      {labels[role as keyof typeof labels]}
    </span>
  );
}

function UserModal({ user, establishments, shops, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    role: user?.role || 'cashier',
    tenant_id: user?.tenant_id || '',
    shop_id: user?.shop_id || '',
    is_active: user?.is_active !== undefined ? user.is_active : true,
    password: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const filteredShops = shops.filter((shop: Shop) => shop.tenant_id === formData.tenant_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (user) {
        // Update existing user
        const updateData: any = {
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          tenant_id: formData.tenant_id || null,
          shop_id: formData.shop_id || null,
          is_active: formData.is_active,
        };

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Update email if changed (requires Supabase Auth API)
        if (formData.email !== user.email) {
          // Note: This would require admin privileges
          console.log('Email update requires admin API call');
        }
      } else {
        // Create new user
        // Utiliser signUp au lieu de admin.createUser car nous n'avons pas les droits admin dans le frontend
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
            },
            emailRedirectTo: undefined, // Pas de redirection email
          },
        });

        if (authError) throw authError;
        
        if (!authData.user) {
          throw new Error('Impossible de créer l\'utilisateur Auth');
        }

        // Attendre un peu pour que le trigger auth.users se termine
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mettre à jour ou créer l'enregistrement utilisateur
        const { error: upsertError } = await supabase
          .from('users')
          .upsert([{
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            tenant_id: formData.tenant_id || null,
            shop_id: formData.shop_id || null,
            is_active: formData.is_active,
          }], {
            onConflict: 'id',
          });

        if (upsertError) throw upsertError;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving user:', error);
      setError(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                disabled={!!user}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                placeholder="jean@exemple.com"
              />
              {user && (
                <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+221 77 123 45 67"
              />
            </div>

            {!user && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!user}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="cashier">Caissier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                {!user && <option value="super_admin">Super Admin</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Établissement
              </label>
              <select
                value={formData.tenant_id}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    tenant_id: e.target.value,
                    shop_id: '' // Reset shop when establishment changes
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Aucun (Super Admin)</option>
                {establishments.map((est: Establishment) => (
                  <option key={est.id} value={est.id}>
                    {est.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.tenant_id && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boutique (optionnel)
                </label>
                <select
                  value={formData.shop_id}
                  onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Toutes les boutiques</option>
                  {filteredShops.map((shop: Shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                {filteredShops.length === 0 && formData.tenant_id && (
                  <p className="text-xs text-orange-600 mt-1">
                    Aucune boutique disponible pour cet établissement
                  </p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Compte actif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
