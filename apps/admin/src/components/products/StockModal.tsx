import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Minus, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  min_stock_level: number;
}

interface Shop {
  id: string;
  name: string;
}

interface Inventory {
  shop_id: string;
  quantity: number;
  min_quantity: number;
  shop?: { name: string };
}

interface StockModalProps {
  product: Product;
  shops: Shop[];
  onClose: () => void;
  onSave: () => void;
}

export default function StockModal({ product, shops, onClose, onSave }: StockModalProps) {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState('');
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*, shop:shops(name)')
        .eq('product_id', product.id);

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShop || adjustment <= 0) return;

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const currentInventory = inventory.find((inv) => inv.shop_id === selectedShop);
      const currentQuantity = currentInventory?.quantity || 0;
      const newQuantity = adjustmentType === 'add'
        ? currentQuantity + adjustment
        : Math.max(0, currentQuantity - adjustment);

      // Update or insert inventory
      if (currentInventory) {
        const { error } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity, last_restock_date: new Date().toISOString() })
          .eq('shop_id', selectedShop)
          .eq('product_id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory').insert([{
          shop_id: selectedShop,
          product_id: product.id,
          quantity: newQuantity,
          min_quantity: product.min_stock_level,
          last_restock_date: new Date().toISOString(),
        }]);
        if (error) throw error;
      }

      // Create stock movement record
      await supabase.from('stock_movements').insert([{
        shop_id: selectedShop,
        product_id: product.id,
        type: adjustmentType === 'add' ? 'in' : 'out',
        quantity: adjustment,
        notes: notes || null,
        user_id: user.id,
      }]);

      setAdjustment(0);
      setNotes('');
      await loadInventory();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Erreur lors de l\'ajustement du stock');
    } finally {
      setSaving(false);
    }
  }

  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const lowStockShops = inventory.filter((inv) => inv.quantity < inv.min_quantity);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-600">Stock total : {totalStock} unités</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stock Adjustment Form */}
          <form onSubmit={handleAdjustment} className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Ajuster le stock</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Boutique *</label>
                <select value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">Sélectionner une boutique</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'ajustement *</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}>
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                  <button type="button"
                    onClick={() => setAdjustmentType('remove')}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      adjustmentType === 'remove'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}>
                    <Minus className="w-4 h-4" />
                    Retirer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantité *</label>
                <input type="number" min="1" required
                  value={adjustment}
                  onChange={(e) => setAdjustment(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="10" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Réapprovisionnement..." />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Enregistrement...' : 'Appliquer l\'ajustement'}
              </button>
            </div>
          </form>

          {/* Stock by Shop */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Stock par boutique</h4>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun stock enregistré</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inventory.map((inv) => (
                  <div key={inv.shop_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900">{inv.shop?.name}</h5>
                      <p className="text-sm text-gray-600">Minimum : {inv.min_quantity} unités</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">{inv.quantity}</span>
                        {inv.quantity < inv.min_quantity ? (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      {inv.quantity < inv.min_quantity && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Stock bas
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alert */}
          {lowStockShops.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-red-900 mb-1">Alerte stock bas</h5>
                  <p className="text-sm text-red-700">
                    {lowStockShops.length} boutique{lowStockShops.length > 1 ? 's' : ''} en dessous du stock minimum
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button onClick={() => { onSave(); onClose(); }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
