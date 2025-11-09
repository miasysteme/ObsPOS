import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';

interface ShopDetailModalProps {
  shop: any;
  onClose: () => void;
}

interface Sale {
  id: string;
  ticket_number: string;
  total_amount: number;
  payment_method: string;
  customer_type: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface StockItem {
  product: {
    name: string;
    sku: string;
    min_stock: number;
  };
  quantity: number;
  min_stock: number;
}

interface ShopUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string;
}

export default function ShopDetailModal({ shop, onClose }: ShopDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'stock' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today_sales: 0,
    today_revenue: 0,
    week_sales: 0,
    week_revenue: 0,
    month_sales: 0,
    month_revenue: 0,
    total_products: 0,
    low_stock_products: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [shopUsers, setShopUsers] = useState<ShopUser[]>([]);

  useEffect(() => {
    loadShopData();
  }, [shop.id]);

  async function loadShopData() {
    try {
      setLoading(true);

      // Stats ventes (aujourd'hui, semaine, mois)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      const [todaySales, weekSales, monthSales] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'completed')
          .gte('created_at', today.toISOString()),
        
        supabase
          .from('sales')
          .select('total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'completed')
          .gte('created_at', weekAgo.toISOString()),
        
        supabase
          .from('sales')
          .select('total_amount')
          .eq('shop_id', shop.id)
          .eq('status', 'completed')
          .gte('created_at', monthAgo.toISOString()),
      ]);

      setStats({
        today_sales: todaySales.data?.length || 0,
        today_revenue: todaySales.data?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
        week_sales: weekSales.data?.length || 0,
        week_revenue: weekSales.data?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
        month_sales: monthSales.data?.length || 0,
        month_revenue: monthSales.data?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
        total_products: 0,
        low_stock_products: 0,
      });

      // Ventes récentes
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          id,
          ticket_number,
          total_amount,
          payment_method,
          customer_type,
          created_at,
          users!inner(full_name)
        `)
        .eq('shop_id', shop.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform data to match Sale interface
      const formattedSales = salesData?.map(sale => ({
        ...sale,
        user: Array.isArray(sale.users) ? sale.users[0] : sale.users
      })) || [];
      setRecentSales(formattedSales as any);

      // Stock critique
      const { data: stockData } = await supabase
        .from('inventory')
        .select(`
          quantity,
          min_stock,
          products!inner(name, sku, min_stock)
        `)
        .eq('shop_id', shop.id);

      // Filter low stock items
      const formattedStock = stockData?.map(item => ({
        ...item,
        product: Array.isArray(item.products) ? item.products[0] : item.products
      })) || [];
      
      const lowStock = formattedStock.filter((item: any) => 
        item.quantity < (item.product?.min_stock || 5)
      );

      setLowStockItems(lowStock as any);

      // Total produits
      const { count: totalProducts } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id);

      setStats(prev => ({
        ...prev,
        total_products: totalProducts || 0,
        low_stock_products: lowStock.length,
      }));

      // Utilisateurs
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active, last_login_at')
        .eq('shop_id', shop.id)
        .order('full_name');

      setShopUsers(usersData || []);

    } catch (error) {
      console.error('Error loading shop data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt={shop.name}
                  className="w-16 h-16 rounded-lg bg-white object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{shop.name}</h2>
                <p className="text-white text-opacity-80">{shop.establishment?.name}</p>
                <p className="text-sm text-white text-opacity-70 mt-1">{shop.address}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 font-medium transition border-b-2 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vue Générale
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-2 font-medium transition border-b-2 ${
              activeTab === 'sales'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ventes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 px-2 font-medium transition border-b-2 ${
              activeTab === 'stock'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Stock ({stats.low_stock_products > 0 && (
                <span className="text-orange-600 font-bold">{stats.low_stock_products}</span>
              )})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-2 font-medium transition border-b-2 ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs ({shopUsers.length})
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard
                      title="Aujourd'hui"
                      sales={stats.today_sales}
                      revenue={stats.today_revenue}
                      icon={Calendar}
                      color="blue"
                    />
                    <StatsCard
                      title="Cette Semaine"
                      sales={stats.week_sales}
                      revenue={stats.week_revenue}
                      icon={TrendingUp}
                      color="green"
                    />
                    <StatsCard
                      title="Ce Mois"
                      sales={stats.month_sales}
                      revenue={stats.month_revenue}
                      icon={BarChart3}
                      color="purple"
                    />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Produits en Stock</p>
                          <p className="text-2xl font-bold text-blue-900">{stats.total_products}</p>
                        </div>
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>

                    <div className={`rounded-lg p-4 ${stats.low_stock_products > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${stats.low_stock_products > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            Stock Critique
                          </p>
                          <p className={`text-2xl font-bold ${stats.low_stock_products > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                            {stats.low_stock_products}
                          </p>
                        </div>
                        {stats.low_stock_products > 0 ? (
                          <AlertTriangle className="w-8 h-8 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ventes récentes */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Ventes Récentes</h3>
                    {recentSales.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucune vente récente
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentSales.slice(0, 5).map(sale => (
                          <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{sale.ticket_number || `#${sale.id.slice(0, 8)}`}</p>
                                <p className="text-sm text-gray-600">{sale.user?.full_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{sale.total_amount.toLocaleString()} F</p>
                              <p className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Historique des Ventes</h3>
                  {recentSales.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>Aucune vente enregistrée</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentSales.map(sale => (
                        <div key={sale.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                              #{sale.ticket_number?.split('-').pop() || sale.id.slice(0, 4).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{sale.ticket_number || `Vente #${sale.id.slice(0, 8)}`}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-600">{sale.user?.full_name}</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {sale.payment_method}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {sale.customer_type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{sale.total_amount.toLocaleString()} F</p>
                            <p className="text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(sale.created_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stock' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Stock Critique</h3>
                    <span className="text-sm text-gray-600">
                      {stats.low_stock_products} produit(s) en stock faible
                    </span>
                  </div>
                  {lowStockItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                      <p className="text-lg font-medium text-gray-900">Aucun problème de stock</p>
                      <p className="text-sm">Tous les produits ont un stock suffisant</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lowStockItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border-l-4 border-orange-500 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                            <div>
                              <p className="font-semibold text-gray-900">{item.product.name}</p>
                              <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-600">{item.quantity} unités</p>
                            <p className="text-xs text-gray-600">Min: {item.product.min_stock || 5}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Utilisateurs Affectés</h3>
                  {shopUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p>Aucun utilisateur affecté</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shopUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              user.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.full_name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              user.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'cashier' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                            {user.last_login_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Dernier login: {new Date(user.last_login_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, sales, revenue, icon: Icon, color }: any) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} text-white rounded-lg p-6 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white text-opacity-90 font-medium">{title}</p>
        <Icon className="w-6 h-6 text-white text-opacity-80" />
      </div>
      <div>
        <p className="text-3xl font-bold">{sales}</p>
        <p className="text-sm text-white text-opacity-80">vente(s)</p>
        <div className="mt-2 pt-2 border-t border-white border-opacity-20">
          <p className="text-xl font-semibold">{revenue.toLocaleString()} F</p>
        </div>
      </div>
    </div>
  );
}
