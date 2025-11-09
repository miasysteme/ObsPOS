import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Package,
  Store,
} from 'lucide-react';

interface SalesStats {
  totalRevenue: number;
  totalSales: number;
  averageBasket: number;
  revenueGrowth: number;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
  category?: { name: string };
}

interface ShopPerformance {
  shop_id: string;
  shop_name: string;
  total_sales: number;
  total_revenue: number;
  avg_basket: number;
}

interface SalesData {
  date: string;
  revenue: number;
  sales_count: number;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalesStats>({
    totalRevenue: 0,
    totalSales: 0,
    averageBasket: 0,
    revenueGrowth: 0,
  });
  
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [shopPerformance, setShopPerformance] = useState<ShopPerformance[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  async function loadReports() {
    try {
      setLoading(true);
      
      await Promise.all([
        loadSalesStats(),
        loadTopProducts(),
        loadShopPerformance(),
        loadSalesTimeline(),
      ]);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesStats() {
    const { data: sales } = await supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59')
      .eq('status', 'completed');

    if (sales) {
      const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
      const totalSales = sales.length;
      const averageBasket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Calculer la croissance (comparer avec période précédente)
      const daysDiff = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(new Date(dateRange.start).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const previousEnd = new Date(new Date(dateRange.start).getTime() - 1).toISOString().split('T')[0];

      const { data: previousSales } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', previousStart)
        .lte('created_at', previousEnd + 'T23:59:59')
        .eq('status', 'completed');

      const previousRevenue = previousSales?.reduce((sum, s) => sum + parseFloat(s.total_amount), 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      setStats({
        totalRevenue,
        totalSales,
        averageBasket,
        revenueGrowth,
      });
    }
  }

  async function loadTopProducts() {
    const { data } = await supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        product:products (
          id,
          name,
          sku,
          category:categories(name)
        )
      `)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59');

    if (data) {
      const productMap = new Map<string, TopProduct>();

      data.forEach((item: any) => {
        if (!item.product) return;

        const productId = item.product.id;
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.quantity_sold += item.quantity;
          existing.revenue += item.unit_price * item.quantity;
        } else {
          productMap.set(productId, {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            quantity_sold: item.quantity,
            revenue: item.unit_price * item.quantity,
            category: item.product.category,
          });
        }
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setTopProducts(topProducts);
    }
  }

  async function loadShopPerformance() {
    const { data } = await supabase
      .from('sales')
      .select(`
        shop_id,
        total_amount,
        shop:shops(id, name)
      `)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59')
      .eq('status', 'completed');

    if (data) {
      const shopMap = new Map<string, ShopPerformance>();

      data.forEach((sale: any) => {
        if (!sale.shop) return;

        const shopId = sale.shop.id;
        if (shopMap.has(shopId)) {
          const existing = shopMap.get(shopId)!;
          existing.total_sales += 1;
          existing.total_revenue += parseFloat(sale.total_amount);
          existing.avg_basket = existing.total_revenue / existing.total_sales;
        } else {
          shopMap.set(shopId, {
            shop_id: sale.shop.id,
            shop_name: sale.shop.name,
            total_sales: 1,
            total_revenue: parseFloat(sale.total_amount),
            avg_basket: parseFloat(sale.total_amount),
          });
        }
      });

      const performance = Array.from(shopMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);

      setShopPerformance(performance);
    }
  }

  async function loadSalesTimeline() {
    const { data } = await supabase
      .from('sales')
      .select('total_amount, created_at')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end + 'T23:59:59')
      .eq('status', 'completed')
      .order('created_at');

    if (data) {
      const dailyMap = new Map<string, { revenue: number; count: number }>();

      data.forEach((sale: any) => {
        const date = sale.created_at.split('T')[0];
        if (dailyMap.has(date)) {
          const existing = dailyMap.get(date)!;
          existing.revenue += parseFloat(sale.total_amount);
          existing.count += 1;
        } else {
          dailyMap.set(date, {
            revenue: parseFloat(sale.total_amount),
            count: 1,
          });
        }
      });

      const timeline = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          sales_count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData(timeline);
    }
  }

  async function exportToCSV() {
    const csv = [
      ['Date', 'CA (FCFA)', 'Nombre de ventes'],
      ...salesData.map(d => [d.date, d.revenue, d.sales_count]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_ventes_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Analytics</h1>
          <p className="text-gray-600">Analyse détaillée des performances</p>
        </div>
        
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="text-gray-500">→</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={loadReports}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtrer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            {stats.revenueGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueGrowth > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(stats.revenueGrowth).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">Chiffre d'Affaires</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalRevenue.toLocaleString()} FCFA
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Nombre de Ventes</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalSales}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Panier Moyen</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.averageBasket.toLocaleString()} FCFA
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Clients Servis</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalSales}
          </p>
        </div>
      </div>

      {/* Graphique Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Évolution du CA</h3>
        </div>
        <div className="h-64">
          {salesData.length > 0 ? (
            <div className="space-y-2">
              {salesData.slice(-14).map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24">
                    {new Date(data.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                    <div
                      className="bg-primary rounded-full h-6 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.min((data.revenue / Math.max(...salesData.map(d => d.revenue))) * 100, 100)}%`,
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {(data.revenue / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {data.sales_count} vente{data.sales_count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Top 10 Produits</h3>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku} • {product.quantity_sold} vendus</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{(product.revenue / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-gray-500">FCFA</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Boutiques */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Store className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Performance par Boutique</h3>
          </div>
          <div className="space-y-4">
            {shopPerformance.map((shop) => (
              <div key={shop.shop_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{shop.shop_name}</h4>
                  <span className="text-sm text-gray-500">{shop.total_sales} ventes</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">CA Total</p>
                    <p className="text-lg font-bold text-green-600">
                      {(shop.total_revenue / 1000).toFixed(0)}k FCFA
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Panier Moyen</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(shop.avg_basket / 1000).toFixed(0)}k FCFA
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
