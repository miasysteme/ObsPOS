import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Package,
  TruckIcon,
  ClipboardList,
  AlertTriangle,
  History,
  ArrowRightLeft,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Settings,
} from 'lucide-react';
import TransferModal from '../components/inventory/TransferModal';
import TransferDetailsModal from '../components/inventory/TransferDetailsModal';
import InventoryModal from '../components/inventory/InventoryModal';
import AdjustmentModal from '../components/inventory/AdjustmentModal';

interface Tab {
  id: string;
  name: string;
  icon: any;
}

const tabs: Tab[] = [
  { id: 'transfers', name: 'Transferts', icon: TruckIcon },
  { id: 'inventories', name: 'Inventaires', icon: ClipboardList },
  { id: 'alerts', name: 'Alertes Stock', icon: AlertTriangle },
  { id: 'history', name: 'Historique', icon: History },
];

interface StockTransfer {
  id: string;
  transfer_number: string;
  status: string;
  from_shop: { id: string; name: string };
  to_shop: { id: string; name: string };
  requested_at: string;
  items_count?: number;
}

interface LowStockAlert {
  product_id: string;
  product_name: string;
  sku: string;
  shop_id: string;
  shop_name: string;
  current_quantity: number;
  min_stock_level: number;
  shortage: number;
  alert_level: string;
}

interface PhysicalInventory {
  id: string;
  inventory_number: string;
  status: string;
  shop: { id: string; name: string };
  started_at: string;
  total_items: number;
  total_discrepancies: number;
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('transfers');
  const [loading, setLoading] = useState(true);
  
  // Transfers data
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [searchTransfers, setSearchTransfers] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Alerts data
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [searchAlerts, setSearchAlerts] = useState('');
  const [filterAlertLevel, setFilterAlertLevel] = useState('all');
  
  // Inventories data
  const [inventories, setInventories] = useState<PhysicalInventory[]>([]);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'transfers') {
        await loadTransfers();
      } else if (activeTab === 'alerts') {
        await loadAlerts();
      } else if (activeTab === 'inventories') {
        await loadInventories();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransfers() {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select(`
        *,
        from_shop:shops!stock_transfers_from_shop_id_fkey(id, name),
        to_shop:shops!stock_transfers_to_shop_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading transfers:', error);
      return;
    }

    setTransfers(data || []);
  }

  async function loadAlerts() {
    // Refresh materialized view first
    await supabase.rpc('refresh_low_stock_alerts');
    
    const { data, error } = await supabase
      .from('low_stock_alerts')
      .select('*')
      .order('alert_level', { ascending: false });

    if (error) {
      console.error('Error loading alerts:', error);
      return;
    }

    setAlerts(data || []);
  }

  async function loadInventories() {
    const { data, error } = await supabase
      .from('physical_inventories')
      .select('*, shop:shops(id, name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading inventories:', error);
      return;
    }

    setInventories(data || []);
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_TRANSIT: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
    };
    
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      IN_TRANSIT: 'En transit',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
      IN_PROGRESS: 'En cours',
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getAlertBadge = (level: string) => {
    const styles: Record<string, string> = {
      OUT_OF_STOCK: 'bg-red-100 text-red-700 border-red-300',
      CRITICAL: 'bg-orange-100 text-orange-700 border-orange-300',
      LOW: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      OK: 'bg-green-100 text-green-700 border-green-300',
    };
    
    const labels: Record<string, string> = {
      OUT_OF_STOCK: 'Rupture',
      CRITICAL: 'Critique',
      LOW: 'Bas',
      OK: 'OK',
    };
    
    const icons: Record<string, any> = {
      OUT_OF_STOCK: XCircle,
      CRITICAL: AlertTriangle,
      LOW: AlertCircle,
      OK: CheckCircle,
    };
    
    const Icon = icons[level] || AlertCircle;
    
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${styles[level] || 'bg-gray-100 text-gray-700'}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{labels[level] || level}</span>
      </div>
    );
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = 
      t.transfer_number.toLowerCase().includes(searchTransfers.toLowerCase()) ||
      t.from_shop.name.toLowerCase().includes(searchTransfers.toLowerCase()) ||
      t.to_shop.name.toLowerCase().includes(searchTransfers.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch =
      a.product_name.toLowerCase().includes(searchAlerts.toLowerCase()) ||
      a.sku.toLowerCase().includes(searchAlerts.toLowerCase()) ||
      a.shop_name.toLowerCase().includes(searchAlerts.toLowerCase());
    
    const matchesLevel = filterAlertLevel === 'all' || a.alert_level === filterAlertLevel;
    
    return matchesSearch && matchesLevel;
  });

  const stats = {
    pendingTransfers: transfers.filter(t => t.status === 'PENDING').length,
    activeInventories: inventories.filter(i => i.status === 'IN_PROGRESS').length,
    criticalAlerts: alerts.filter(a => a.alert_level === 'OUT_OF_STOCK' || a.alert_level === 'CRITICAL').length,
    totalAlerts: alerts.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion d'Inventaire</h1>
          <p className="text-gray-600">Transferts, inventaires et alertes de stock</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Ajustement manuel"
          >
            <Settings className="w-4 h-4" />
            Ajustement
          </button>
          <button
            onClick={() => {
              if (activeTab === 'transfers') setShowTransferModal(true);
              else if (activeTab === 'inventories') setShowInventoryModal(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'transfers' ? 'Nouveau transfert' : 
             activeTab === 'inventories' ? 'Nouvel inventaire' : 'Action'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TruckIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transferts En Attente</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTransfers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Inventaires Actifs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeInventories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alertes Critiques</p>
              <p className="text-2xl font-bold text-gray-900">{stats.criticalAlerts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Alertes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un transfert..."
                    value={searchTransfers}
                    onChange={(e) => setSearchTransfers(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="PENDING">En attente</option>
                    <option value="APPROVED">Approuvés</option>
                    <option value="IN_TRANSIT">En transit</option>
                    <option value="COMPLETED">Terminés</option>
                  </select>
                </div>
              </div>

              {/* Transfers List */}
              <div className="space-y-3">
                {filteredTransfers.map((transfer) => (
                  <div 
                    key={transfer.id} 
                    onClick={() => setSelectedTransferId(transfer.id)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{transfer.transfer_number}</span>
                          {getStatusBadge(transfer.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">{transfer.from_shop.name}</span>
                          <ArrowRightLeft className="w-4 h-4" />
                          <span className="font-medium">{transfer.to_shop.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(transfer.requested_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}

                {filteredTransfers.length === 0 && (
                  <div className="text-center py-12">
                    <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun transfert trouvé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inventories Tab */}
          {activeTab === 'inventories' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {inventories.map((inventory) => (
                  <div key={inventory.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">{inventory.inventory_number}</span>
                          {getStatusBadge(inventory.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">{inventory.shop.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Démarré le {new Date(inventory.started_at).toLocaleDateString('fr-FR')}
                          </p>
                          {inventory.total_items > 0 && (
                            <p className="text-xs text-gray-500">
                              {inventory.total_items} articles • {inventory.total_discrepancies} écarts
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}

                {inventories.length === 0 && (
                  <div className="text-center py-12">
                    <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun inventaire trouvé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchAlerts}
                    onChange={(e) => setSearchAlerts(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={filterAlertLevel}
                    onChange={(e) => setFilterAlertLevel(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Tous les niveaux</option>
                    <option value="OUT_OF_STOCK">Rupture</option>
                    <option value="CRITICAL">Critique</option>
                    <option value="LOW">Bas</option>
                  </select>
                </div>
                
                <button
                  onClick={loadAlerts}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
              </div>

              {/* Alerts Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boutique</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actuel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manque</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAlerts.map((alert, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{alert.product_name}</div>
                            <div className="text-sm text-gray-500">{alert.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.shop_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${alert.current_quantity === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {alert.current_quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alert.min_stock_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-red-600">
                            {alert.shortage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getAlertBadge(alert.alert_level)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAlerts.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune alerte de stock</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Historique des mouvements</p>
              <p className="text-sm text-gray-500 mt-2">Fonctionnalité en cours de développement</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTransferModal && (
        <TransferModal
          onClose={() => setShowTransferModal(false)}
          onSave={() => {
            setShowTransferModal(false);
            loadData();
          }}
        />
      )}

      {showInventoryModal && (
        <InventoryModal
          onClose={() => setShowInventoryModal(false)}
          onSave={() => {
            setShowInventoryModal(false);
            loadData();
          }}
        />
      )}

      {showAdjustmentModal && (
        <AdjustmentModal
          onClose={() => setShowAdjustmentModal(false)}
          onSave={() => {
            setShowAdjustmentModal(false);
            loadData();
          }}
        />
      )}

      {selectedTransferId && (
        <TransferDetailsModal
          transferId={selectedTransferId}
          onClose={() => setSelectedTransferId(null)}
          onUpdate={() => {
            setSelectedTransferId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
