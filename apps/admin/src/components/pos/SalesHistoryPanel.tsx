import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Receipt, Eye, RotateCcw, RefreshCw, TrendingUp, Package } from 'lucide-react';

interface Sale {
  id: string;
  ticket_number: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  customer_type: string;
  status: string;
  discount_amount: number;
  customer?: { name: string };
  sale_items?: { quantity: number }[];
}

interface SalesHistoryPanelProps {
  shopId: string;
  onViewReceipt: (saleId: string) => void;
  onRefund?: (saleId: string) => void;
}

export default function SalesHistoryPanel({ shopId, onViewReceipt, onRefund }: SalesHistoryPanelProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, count: 0, items: 0 });

  useEffect(() => {
    loadTodaySales();
  }, [shopId]);

  async function loadTodaySales() {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sale_items(quantity)
        `)
        .eq('shop_id', shopId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSales(data || []);

      // Calculer stats
      const totalAmount = data?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const totalItems = data?.reduce((sum, sale) => {
        const itemCount = sale.sale_items?.reduce((s: number, item: { quantity: number }) => s + item.quantity, 0) || 0;
        return sum + itemCount;
      }, 0) || 0;

      setStats({
        total: totalAmount,
        count: data?.length || 0,
        items: totalItems,
      });
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }

  const paymentIcons: Record<string, string> = {
    cash: '💵',
    mobile_money: '📱',
    card: '💳',
    credit: '💰',
  };

  const paymentLabels: Record<string, string> = {
    cash: 'Espèces',
    mobile_money: 'Mobile Money',
    card: 'Carte',
    credit: 'Crédit',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* En-tête avec stats */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Ventes du Jour
          </h2>
          <button
            onClick={loadTodaySales}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>CA Total</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {stats.total.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">FCFA</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
              <Receipt className="w-4 h-4" />
              <span>Ventes</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.count}</p>
            <p className="text-xs text-blue-600">tickets</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-700 text-sm mb-1">
              <Package className="w-4 h-4" />
              <span>Articles</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.items}</p>
            <p className="text-xs text-purple-600">vendus</p>
          </div>
        </div>
      </div>

      {/* Liste des ventes */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Aucune vente aujourd'hui</p>
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {sale.ticket_number || `#${sale.id.slice(0, 8)}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                      sale.status === 'refunded' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {sale.status === 'completed' ? 'Complétée' :
                       sale.status === 'refunded' ? 'Remboursée' : sale.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {sale.customer && ` • ${sale.customer.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {sale.total_amount.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500">
                    {paymentIcons[sale.payment_method] || ''} {paymentLabels[sale.payment_method] || sale.payment_method}
                  </p>
                </div>
              </div>

              {sale.discount_amount > 0 && (
                <div className="text-xs text-green-600 mb-2">
                  💰 Remise: -{sale.discount_amount.toLocaleString()} FCFA
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onViewReceipt(sale.id)}
                  className="flex-1 py-1.5 text-xs border border-primary text-primary rounded hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Voir Reçu
                </button>
                {onRefund && sale.status === 'completed' && (
                  <button
                    onClick={() => onRefund(sale.id)}
                    className="flex-1 py-1.5 text-xs border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Rembourser
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
