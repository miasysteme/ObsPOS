import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, Search, Package } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface TransferItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_requested: number;
}

interface TransferModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function TransferModal({ onClose, onSave }: TransferModalProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState({
    from_shop_id: '',
    to_shop_id: '',
    notes: '',
  });
  
  const [items, setItems] = useState<TransferItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadShops();
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchProduct) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchProduct.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchProduct, products]);

  async function loadShops() {
    const { data } = await supabase
      .from('shops')
      .select('id, name')
      .order('name');
    setShops(data || []);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('is_active', true)
      .order('name');
    setProducts(data || []);
  }

  function addProduct(product: Product) {
    if (items.find(i => i.product_id === product.id)) {
      alert('Ce produit est déjà dans la liste');
      return;
    }
    
    setItems([...items, {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity_requested: 1,
    }]);
    setShowProductSearch(false);
    setSearchProduct('');
  }

  function removeItem(productId: string) {
    setItems(items.filter(i => i.product_id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems(items.map(i =>
      i.product_id === productId
        ? { ...i, quantity_requested: Math.max(1, quantity) }
        : i
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.from_shop_id || !formData.to_shop_id) {
      alert('Veuillez sélectionner les boutiques source et destination');
      return;
    }
    
    if (formData.from_shop_id === formData.to_shop_id) {
      alert('Les boutiques source et destination doivent être différentes');
      return;
    }
    
    if (items.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Générer le numéro de transfert
      const { data: transferNumber } = await supabase
        .rpc('generate_transfer_number');

      // Créer le transfert
      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert([{
          transfer_number: transferNumber,
          from_shop_id: formData.from_shop_id,
          to_shop_id: formData.to_shop_id,
          status: 'PENDING',
          notes: formData.notes || null,
          requested_by: user.id,
        }])
        .select()
        .single();

      if (transferError) throw transferError;

      // Créer les items
      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(items.map(item => ({
          transfer_id: transfer.id,
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
        })));

      if (itemsError) throw itemsError;

      alert('Transfert créé avec succès !');
      onSave();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Nouveau Transfert de Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Boutiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boutique Source *
              </label>
              <select
                required
                value={formData.from_shop_id}
                onChange={(e) => setFormData({ ...formData, from_shop_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boutique Destination *
              </label>
              <select
                required
                value={formData.to_shop_id}
                onChange={(e) => setFormData({ ...formData, to_shop_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Produits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Produits à transférer *
              </label>
              <button
                type="button"
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="px-3 py-1 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter produit
              </button>
            </div>

            {/* Recherche Produit */}
            {showProductSearch && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredProducts.slice(0, 10).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors"
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste Produits */}
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.product_name}</div>
                    <div className="text-sm text-gray-500">{item.sku}</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity_requested}
                    onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.product_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucun produit ajouté</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le transfert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
