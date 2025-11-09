import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Store,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Users,
  ShoppingCart,
  Printer,
  DollarSign,
  TrendingUp,
  Package,
} from 'lucide-react';

interface Shop {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  logo_url: string | null;
  print_config: {
    format: 'A4' | '80mm' | '57mm';
    show_logo: boolean;
    show_header: boolean;
    header_text: string;
    footer_text: string;
  };
  created_at: string;
  establishment?: {
    name: string;
    logo_url: string | null;
  };
  users_count?: number;
  sales_count?: number;
  total_sales?: number;
}

export default function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEstablishment, setFilterEstablishment] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [showPrintConfigModal, setShowPrintConfigModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load establishments
      const { data: estData } = await supabase
        .from('establishments')
        .select('id, name, logo_url')
        .order('name');
      
      setEstablishments(estData || []);

      // Load shops
      const { data: shopsData, error } = await supabase
        .from('shops')
        .select(`
          *,
          establishment:establishments(name, logo_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Guard against null/undefined data
      if (!shopsData || !Array.isArray(shopsData)) {
        setShops([]);
        return;
      }

      // Load stats for each shop
      const shopsWithStats = await Promise.all(
        shopsData.map(async (shop: any) => {
          const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id);

          // Placeholder for sales stats (à implémenter avec la table sales)
          return {
            ...shop,
            users_count: usersCount || 0,
            sales_count: 0,
            total_sales: 0,
          };
        })
      );

      setShops(shopsWithStats);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty array on error to prevent infinite loading
      setShops([]);
      setEstablishments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette boutique ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShops(shops.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting shop:', error);
      alert('Erreur lors de la suppression de la boutique');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setShops(shops.map(s => 
        s.id === id ? { ...s, is_active: !currentStatus } : s
      ));
    } catch (error) {
      console.error('Error toggling shop status:', error);
      alert('Erreur lors de la modification du statut');
    }
  }

  const filteredShops = shops.filter(shop => {
    const matchesSearch = 
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.establishment?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && shop.is_active) ||
      (filterStatus === 'inactive' && !shop.is_active);

    const matchesEstablishment = 
      filterEstablishment === 'all' || 
      shop.tenant_id === filterEstablishment;

    return matchesSearch && matchesStatus && matchesEstablishment;
  });

  const stats = {
    total: shops.length,
    active: shops.filter(s => s.is_active).length,
    inactive: shops.filter(s => !s.is_active).length,
    totalSales: shops.reduce((sum, s) => sum + (s.total_sales || 0), 0),
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Boutiques</h1>
        <p className="text-gray-600">Gérez les boutiques et leurs configurations POS</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Boutiques"
          value={stats.total}
          icon={Store}
          color="blue"
        />
        <StatCard
          title="Actives"
          value={stats.active}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Inactives"
          value={stats.inactive}
          icon={Package}
          color="orange"
        />
        <StatCard
          title="Ventes Totales"
          value={`${stats.totalSales.toLocaleString()} F`}
          icon={DollarSign}
          color="purple"
          isAmount
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
                placeholder="Rechercher une boutique..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <select
              value={filterEstablishment}
              onChange={(e) => setFilterEstablishment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'active'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Actives
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'inactive'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactives
            </button>

            <button
              onClick={() => {
                setEditingShop(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une boutique
            </button>
          </div>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterEstablishment !== 'all'
                ? 'Aucune boutique trouvée'
                : 'Aucune boutique enregistrée'}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              onEdit={() => {
                setEditingShop(shop);
                setShowAddModal(true);
              }}
              onDelete={() => handleDelete(shop.id)}
              onToggleActive={() => handleToggleActive(shop.id, shop.is_active)}
              onConfigurePrint={() => {
                setSelectedShop(shop);
                setShowPrintConfigModal(true);
              }}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <ShopModal
          shop={editingShop}
          establishments={establishments}
          onClose={() => {
            setShowAddModal(false);
            setEditingShop(null);
          }}
          onSave={() => {
            loadData();
            setShowAddModal(false);
            setEditingShop(null);
          }}
        />
      )}

      {showPrintConfigModal && selectedShop && (
        <PrintConfigModal
          shop={selectedShop}
          onClose={() => {
            setShowPrintConfigModal(false);
            setSelectedShop(null);
          }}
          onSave={() => {
            loadData();
            setShowPrintConfigModal(false);
            setSelectedShop(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, isAmount }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-gray-900 ${isAmount ? 'text-lg' : ''}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ShopCard({ shop, onEdit, onDelete, onToggleActive, onConfigurePrint }: any) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-primary to-primary-600 p-4 text-white">
        <div className="flex items-center gap-3">
          {shop.logo_url || shop.establishment?.logo_url ? (
            <img
              src={shop.logo_url || shop.establishment?.logo_url}
              alt={shop.name}
              className="w-12 h-12 rounded-lg bg-white object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg">{shop.name}</h3>
            <p className="text-sm text-white text-opacity-80">{shop.establishment?.name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{shop.address || 'Adresse non renseignée'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{shop.users_count || 0} utilisateur(s)</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp className="w-4 h-4" />
          <span>{shop.sales_count || 0} vente(s)</span>
        </div>

        {/* Status Badge */}
        <div className="pt-2">
          <button
            onClick={onToggleActive}
            className={`w-full px-3 py-1 rounded-full text-xs font-medium transition ${
              shop.is_active
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {shop.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex gap-2">
        <button
          onClick={onConfigurePrint}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded transition"
          title="Configuration d'impression"
        >
          <Printer className="w-4 h-4" />
          <span className="text-sm">POS</span>
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded transition"
          title="Modifier"
        >
          <Edit className="w-4 h-4" />
          <span className="text-sm">Modifier</span>
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Supprimer</span>
        </button>
      </div>
    </div>
  );
}

function ShopModal({ shop, establishments, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    tenant_id: shop?.tenant_id || '',
    name: shop?.name || '',
    address: shop?.address || '',
    phone: shop?.phone || '',
    email: shop?.email || '',
    is_active: shop?.is_active !== undefined ? shop.is_active : true,
    logo_url: shop?.logo_url || null,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `shop-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erreur lors du téléchargement du logo');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const defaultPrintConfig = {
        format: 'A4' as const,
        show_logo: true,
        show_header: true,
        header_text: formData.name,
        footer_text: 'Merci de votre visite !',
      };

      const dataToSave = {
        ...formData,
        print_config: shop?.print_config || defaultPrintConfig,
      };

      if (shop) {
        const { error } = await supabase
          .from('shops')
          .update(dataToSave)
          .eq('id', shop.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shops')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving shop:', error);
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
            {shop ? 'Modifier la boutique' : 'Nouvelle boutique'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Établissement *
            </label>
            <select
              required
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Sélectionnez un établissement</option>
              {establishments.map((est: any) => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de la boutique *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Nom de la boutique"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Adresse complète de la boutique"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo de la boutique
            </label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Téléchargement...</p>}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Le logo sera affiché sur les factures et tickets de caisse
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Boutique active
            </label>
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
              disabled={saving || uploading}
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

function PrintConfigModal({ shop, onClose, onSave }: any) {
  const [config, setConfig] = useState({
    format: shop?.print_config?.format || 'A4',
    show_logo: shop?.print_config?.show_logo !== false,
    show_header: shop?.print_config?.show_header !== false,
    header_text: shop?.print_config?.header_text || shop.name,
    footer_text: shop?.print_config?.footer_text || 'Merci de votre visite !',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('shops')
        .update({ print_config: config })
        .eq('id', shop.id);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Error saving print config:', error);
      alert('Erreur lors de la sauvegarde de la configuration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Printer className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Configuration POS</h2>
              <p className="text-sm text-gray-600">{shop.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Format d'impression */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Format d'impression
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setConfig({ ...config, format: 'A4' })}
                className={`p-4 border-2 rounded-lg transition ${
                  config.format === 'A4'
                    ? 'border-primary bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="w-12 h-16 border-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="font-medium">A4</p>
                  <p className="text-xs text-gray-500">Facture professionnelle</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, format: '80mm' })}
                className={`p-4 border-2 rounded-lg transition ${
                  config.format === '80mm'
                    ? 'border-primary bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="w-8 h-16 border-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="font-medium">80mm</p>
                  <p className="text-xs text-gray-500">Ticket caisse standard</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, format: '57mm' })}
                className={`p-4 border-2 rounded-lg transition ${
                  config.format === '57mm'
                    ? 'border-primary bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="w-6 h-16 border-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="font-medium">57mm</p>
                  <p className="text-xs text-gray-500">Ticket caisse compact</p>
                </div>
              </button>
            </div>
          </div>

          {/* Options d'affichage */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Options d'affichage
            </label>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="show_logo"
                checked={config.show_logo}
                onChange={(e) => setConfig({ ...config, show_logo: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="show_logo" className="text-sm font-medium text-gray-700 flex-1">
                Afficher le logo
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="show_header"
                checked={config.show_header}
                onChange={(e) => setConfig({ ...config, show_header: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="show_header" className="text-sm font-medium text-gray-700 flex-1">
                Afficher l'en-tête personnalisé
              </label>
            </div>
          </div>

          {/* Textes personnalisés */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte d'en-tête
              </label>
              <input
                type="text"
                value={config.header_text}
                onChange={(e) => setConfig({ ...config, header_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ex: Bienvenue chez..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte de pied de page
              </label>
              <textarea
                value={config.footer_text}
                onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Ex: Merci de votre visite !"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Aperçu du ticket</h3>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded p-4 max-w-sm mx-auto">
              {config.show_logo && (
                <div className="text-center mb-3">
                  <div className="w-16 h-16 bg-gray-200 rounded mx-auto"></div>
                </div>
              )}
              {config.show_header && (
                <div className="text-center font-bold mb-2">{config.header_text}</div>
              )}
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Article 1</span>
                  <span>1 000 F</span>
                </div>
                <div className="flex justify-between">
                  <span>Article 2</span>
                  <span>2 500 F</span>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>3 500 F</span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="text-center text-xs text-gray-600">{config.footer_text}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
