import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Package, Search } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
}

interface AdjustmentModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function AdjustmentModal({ onClose, onSave }: AdjustmentModalProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [shopId, setShopId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [reason, setReason] = useState('CORRECTION');
  const [notes, setNotes] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (shopId) {
      loadProducts(shopId);
    }
  }, [shopId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  async function loadShops() {
    const { data } = await supabase
      .from('shops')
      .select('id, name')
      .order('name');
    setShops(data || []);
  }

  async function loadProducts(shop_id: string) {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        product_id,
        quantity,
        product:products(id, name, sku)
      `)
      .eq('shop_id', shop_id);

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    const productsData = data.map((item: any) => ({
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku,
      current_stock: item.quantity,
    }));

    setProducts(productsData);
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setNewQuantity(product.current_stock);
    setShowProductSearch(false);
    setSearchTerm('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!shopId || !selectedProduct) {
      alert('Veuillez sélectionner une boutique et un produit');
      return;
    }
    
    if (newQuantity === selectedProduct.current_stock) {
      alert('La nouvelle quantité est identique à la quantité actuelle');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Générer le numéro d'ajustement
      const { data: adjustmentNumber } = await supabase
        .rpc('generate_adjustment_number');

      const quantityChange = newQuantity - selectedProduct.current_stock;

      // Créer l'ajustement
      const { error: adjustmentError } = await supabase
        .from('stock_adjustments')
        .insert([{
          adjustment_number: adjustmentNumber,
          shop_id: shopId,
          product_id: selectedProduct.id,
          quantity_before: selectedProduct.current_stock,
          quantity_change: quantityChange,
          quantity_after: newQuantity,
          reason: reason,
          notes: notes || null,
          created_by: user.id,
        }]);

      if (adjustmentError) throw adjustmentError;

      // Mettre à jour le stock
      const { error: stockError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('shop_id', shopId)
        .eq('product_id', selectedProduct.id);

      if (stockError) throw stockError;

      // Créer le mouvement de stock
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          shop_id: shopId,
          product_id: selectedProduct.id,
          movement_type: quantityChange > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: quantityChange,
          reference_type: 'ADJUSTMENT',
          reference_id: adjustmentNumber,
          notes: notes || `Ajustement manuel: ${reason}`,
          created_by: user.id,
        }]);

      if (movementError) throw movementError;

      alert('Ajustement créé avec succès !');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const quantityChange = selectedProduct ? newQuantity - selectedProduct.current_stock : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Ajustement Manuel de Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Boutique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Boutique *
            </label>
            <select
              required
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                setSelectedProduct(null);
                setNewQuantity(0);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Sélectionner une boutique...</option>
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>

          {/* Produit */}
          {shopId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produit *
              </label>
              
              {!selectedProduct ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(!showProductSearch)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors text-gray-600 hover:text-gray-900"
                  >
                    Sélectionner un produit...
                  </button>

                  {showProductSearch && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Rechercher un produit..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredProducts.slice(0, 10).map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.sku}</div>
                              </div>
                              <div className="text-sm font-medium text-gray-600">
                                Stock: {product.current_stock}
                              </div>
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            Aucun produit trouvé
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                      <div className="text-sm text-gray-600">{selectedProduct.sku}</div>
                      <div className="text-sm font-medium text-blue-700 mt-1">
                        Stock actuel: {selectedProduct.current_stock}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setNewQuantity(0);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nouvelle Quantité */}
          {selectedProduct && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvelle Quantité *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {quantityChange !== 0 && (
                  <p className={`text-sm mt-1 font-medium ${
                    quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {quantityChange > 0 ? '+' : ''}{quantityChange} unité(s)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de l'ajustement *
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="CORRECTION">Correction d'erreur</option>
                  <option value="DAMAGED">Produit endommagé</option>
                  <option value="LOST">Produit perdu</option>
                  <option value="FOUND">Produit retrouvé</option>
                  <option value="INVENTORY_COUNT">Comptage inventaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes complémentaires
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Expliquez la raison de cet ajustement..."
                />
              </div>
            </>
          )}

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
              disabled={saving || !selectedProduct || quantityChange === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Créer l\'ajustement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
