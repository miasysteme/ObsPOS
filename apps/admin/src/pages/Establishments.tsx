import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Store,
  AlertTriangle,
} from 'lucide-react';

interface Establishment {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  subscription_status: 'active' | 'expired' | 'suspended';
  subscription_expires_at: string;
  is_active: boolean;
  created_at: string;
  shops_count?: number;
  users_count?: number;
}

export default function Establishments() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);

  useEffect(() => {
    loadEstablishments();
  }, []);

  async function loadEstablishments() {
    try {
      setLoading(true);
      
      // Load establishments
      const { data: establishments, error } = await supabase
        .from('establishments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load shops count for each establishment
      const establishmentsWithCounts = await Promise.all(
        establishments.map(async (est: any) => {
          const { count: shopsCount } = await supabase
            .from('shops')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', est.id);

          const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', est.id);

          return {
            ...est,
            shops_count: shopsCount || 0,
            users_count: usersCount || 0,
          };
        })
      );

      setEstablishments(establishmentsWithCounts);
    } catch (error) {
      console.error('Error loading establishments:', error);
      // Set empty array on error to prevent infinite loading
      setEstablishments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEstablishments(establishments.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting establishment:', error);
      alert('Erreur lors de la suppression de l\'établissement');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('establishments')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setEstablishments(establishments.map(e =>
        e.id === id ? { ...e, is_active: !currentStatus } : e
      ));
    } catch (error) {
      console.error('Error toggling establishment status:', error);
    }
  }

  const filteredEstablishments = establishments.filter(est => {
    const matchesSearch = est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || est.subscription_status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: establishments.length,
    active: establishments.filter(e => e.subscription_status === 'active').length,
    expired: establishments.filter(e => e.subscription_status === 'expired').length,
    suspended: establishments.filter(e => e.subscription_status === 'suspended').length,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Établissements</h1>
        <p className="text-gray-600">Gérez les établissements et leurs abonnements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Actifs"
          value={stats.active}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Expirés"
          value={stats.expired}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Suspendus"
          value={stats.suspended}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
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

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="expired">Expirés</option>
              <option value="suspended">Suspendus</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 transition"
            >
              <Plus className="w-5 h-5" />
              Ajouter un établissement
            </button>
          </div>
        </div>
      </div>

      {/* Establishments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Établissement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriétaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boutiques / Utilisateurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonnement
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
              {filteredEstablishments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Aucun établissement trouvé'
                      : 'Aucun établissement enregistré'}
                  </td>
                </tr>
              ) : (
                filteredEstablishments.map((est) => (
                  <tr key={est.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="w-10 h-10 text-primary bg-primary-50 rounded-lg p-2 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{est.name}</div>
                          <div className="text-sm text-gray-500">{est.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{est.owner_name}</div>
                      <div className="text-sm text-gray-500">{est.email}</div>
                      <div className="text-sm text-gray-500">{est.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Store className="w-4 h-4" />
                          {est.shops_count}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          {est.users_count}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(est.subscription_expires_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <SubscriptionBadge status={est.subscription_status} />
                        <button
                          onClick={() => handleToggleActive(est.id, est.is_active)}
                          className={`text-xs px-2 py-1 rounded ${
                            est.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {est.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingEstablishment(est)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(est.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
      {(showAddModal || editingEstablishment) && (
        <EstablishmentModal
          establishment={editingEstablishment}
          onClose={() => {
            setShowAddModal(false);
            setEditingEstablishment(null);
          }}
          onSave={() => {
            loadEstablishments();
            setShowAddModal(false);
            setEditingEstablishment(null);
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
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
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

function SubscriptionBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-orange-100 text-orange-800',
    suspended: 'bg-red-100 text-red-800',
  };

  const labels = {
    active: 'Actif',
    expired: 'Expiré',
    suspended: 'Suspendu',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function EstablishmentModal({ establishment, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: establishment?.name || '',
    owner_name: establishment?.owner_name || '',
    email: establishment?.email || '',
    phone: establishment?.phone || '',
    address: establishment?.address || '',
    subscription_status: establishment?.subscription_status || 'active',
    subscription_expires_at: establishment?.subscription_expires_at 
      ? new Date(establishment.subscription_expires_at).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: establishment?.is_active !== undefined ? establishment.is_active : true,
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Préparer les données avec le bon format de date
      const dataToSave = {
        ...formData,
        subscription_expires_at: formData.subscription_expires_at 
          ? new Date(formData.subscription_expires_at).toISOString()
          : null,
      };

      if (establishment) {
        // Update
        const { error } = await supabase
          .from('establishments')
          .update(dataToSave)
          .eq('id', establishment.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('establishments')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving establishment:', error);
      alert(`Erreur lors de l'enregistrement: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {establishment ? 'Modifier l\'établissement' : 'Nouvel établissement'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'établissement *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Nom de l'établissement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du propriétaire *
              </label>
              <input
                type="text"
                required
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut abonnement
              </label>
              <select
                value={formData.subscription_status}
                onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'expiration
              </label>
              <input
                type="date"
                value={formData.subscription_expires_at}
                onChange={(e) => setFormData({ ...formData, subscription_expires_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
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
