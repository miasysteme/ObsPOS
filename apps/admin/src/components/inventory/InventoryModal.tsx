import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Package, Save, AlertCircle } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
}

interface InventoryCount {
  product_id: string;
  product_name: string;
  sku: string;
  expected_quantity: number;
  counted_quantity: number | null;
  discrepancy: number;
}

interface InventoryModalProps {
  inventoryId?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function InventoryModal({ inventoryId, onClose, onSave }: InventoryModalProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentInventoryId, setCurrentInventoryId] = useState(inventoryId);

  useEffect(() => {
    loadShops();
    if (inventoryId) {
      loadInventory(inventoryId);
    }
  }, [inventoryId]);

  async function loadShops() {
    const { data } = await supabase
      .from('shops')
      .select('id, name')
      .order('name');
    setShops(data || []);
  }

  async function loadInventory(id: string) {
    setLoading(true);
    try {
      const { data: inventory } = await supabase
        .from('physical_inventories')
        .select('*, shop:shops(id, name)')
        .eq('id', id)
        .single();

      if (inventory) {
        setShopId(inventory.shop_id);
        setNotes(inventory.notes || '');
        
        const { data: counts } = await supabase
          .from('inventory_counts')
          .select(`
            *,
            product:products(name, sku)
          `)
          .eq('inventory_id', id);

        if (counts) {
          setCounts(counts.map((c: any) => ({
            product_id: c.product_id,
            product_name: c.product.name,
            sku: c.product.sku,
            expected_quantity: c.expected_quantity,
            counted_quantity: c.counted_quantity,
            discrepancy: (c.counted_quantity || 0) - c.expected_quantity,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartInventory() {
    if (!shopId) {
      alert('Veuillez sélectionner une boutique');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Générer le numéro d'inventaire
      const { data: inventoryNumber } = await supabase
        .rpc('generate_inventory_number');

      // Créer l'inventaire
      const { data: inventory, error: inventoryError } = await supabase
        .from('physical_inventories')
        .insert([{
          inventory_number: inventoryNumber,
          shop_id: shopId,
          status: 'IN_PROGRESS',
          notes: notes || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (inventoryError) throw inventoryError;
      setCurrentInventoryId(inventory.id);

      // Charger tous les produits du stock de cette boutique
      const { data: stockData, error: stockError } = await supabase
        .from('inventory')
        .select(`
          product_id,
          quantity,
          product:products(name, sku)
        `)
        .eq('shop_id', shopId);

      if (stockError) throw stockError;

      if (stockData && stockData.length > 0) {
        // Créer les comptages initiaux
        const { error: countsError } = await supabase
          .from('inventory_counts')
          .insert(stockData.map((item: any) => ({
            inventory_id: inventory.id,
            product_id: item.product_id,
            expected_quantity: item.quantity,
            counted_quantity: null,
          })));

        if (countsError) throw countsError;

        // Charger les comptages
        const { data: counts } = await supabase
          .from('inventory_counts')
          .select(`
            *,
            product:products(name, sku)
          `)
          .eq('inventory_id', inventory.id);

        if (counts) {
          setCounts(counts.map((c: any) => ({
            product_id: c.product_id,
            product_name: c.product.name,
            sku: c.product.sku,
            expected_quantity: c.expected_quantity,
            counted_quantity: null,
            discrepancy: 0,
          })));
        }
      } else {
        alert('Aucun produit en stock dans cette boutique');
      }

    } catch (error: any) {
      console.error('Error starting inventory:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function updateCount(productId: string, value: string) {
    const numValue = value === '' ? null : parseInt(value);
    setCounts(counts.map(c =>
      c.product_id === productId
        ? {
            ...c,
            counted_quantity: numValue,
            discrepancy: (numValue || 0) - c.expected_quantity
          }
        : c
    ));
  }

  async function handleSaveCounts() {
    if (!currentInventoryId) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mettre à jour tous les comptages
      const updates = counts.map(c => ({
        inventory_id: currentInventoryId,
        product_id: c.product_id,
        expected_quantity: c.expected_quantity,
        counted_quantity: c.counted_quantity,
        counted_by: user?.id,
        counted_at: c.counted_quantity !== null ? new Date().toISOString() : null,
      }));

      const { error } = await supabase
        .from('inventory_counts')
        .upsert(updates, {
          onConflict: 'inventory_id,product_id'
        });

      if (error) throw error;
      
      alert('Comptages sauvegardés !');
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleValidateInventory() {
    if (!currentInventoryId) return;
    
    const uncounted = counts.filter(c => c.counted_quantity === null);
    if (uncounted.length > 0) {
      if (!confirm(`${uncounted.length} produits n'ont pas été comptés. Continuer quand même ?`)) {
        return;
      }
    }

    if (!confirm('Valider cet inventaire ? Les stocks seront ajustés automatiquement selon les comptages.')) {
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Sauvegarder les comptages d'abord
      await handleSaveCounts();
      
      // Valider l'inventaire
      const { error } = await supabase
        .from('physical_inventories')
        .update({
          status: 'COMPLETED',
          validated_by: user?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentInventoryId);

      if (error) throw error;
      
      alert('Inventaire validé ! Les stocks ont été ajustés automatiquement.');
      onSave();
      onClose();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const totalDiscrepancies = counts.filter(c => c.discrepancy !== 0).length;
  const totalCounted = counts.filter(c => c.counted_quantity !== null).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {currentInventoryId ? 'Comptage Inventaire' : 'Nouvel Inventaire Physique'}
            </h3>
            {currentInventoryId && (
              <p className="text-sm text-gray-600 mt-1">
                {totalCounted} / {counts.length} produits comptés • {totalDiscrepancies} écarts
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration */}
          {!currentInventoryId && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boutique *
                </label>
                <select
                  required
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner une boutique...</option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Informations sur cet inventaire..."
                />
              </div>

              <button
                onClick={handleStartInventory}
                disabled={loading || !shopId}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Démarrage...' : 'Démarrer l\'inventaire'}
              </button>
            </div>
          )}

          {/* Comptage */}
          {currentInventoryId && counts.length > 0 && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{counts.length}</div>
                  <div className="text-sm text-gray-600">Total Produits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalCounted}</div>
                  <div className="text-sm text-gray-600">Comptés</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${totalDiscrepancies > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {totalDiscrepancies}
                  </div>
                  <div className="text-sm text-gray-600">Écarts</div>
                </div>
              </div>

              {/* Liste Produits */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                  <div className="col-span-5">PRODUIT</div>
                  <div className="col-span-2 text-center">THÉORIQUE</div>
                  <div className="col-span-2 text-center">COMPTÉ</div>
                  <div className="col-span-2 text-center">ÉCART</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {counts.map(count => (
                    <div key={count.product_id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{count.product_name}</div>
                            <div className="text-xs text-gray-500 truncate">{count.sku}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="font-medium text-gray-600">{count.expected_quantity}</span>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          value={count.counted_quantity ?? ''}
                          onChange={(e) => updateCount(count.product_id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="-"
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        {count.counted_quantity !== null ? (
                          <span className={`font-medium ${
                            count.discrepancy > 0 ? 'text-green-600' :
                            count.discrepancy < 0 ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {count.discrepancy > 0 && '+'}{count.discrepancy}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {count.discrepancy !== 0 && count.counted_quantity !== null && (
                          <AlertCircle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={handleSaveCounts}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </button>
                <button
                  onClick={handleValidateInventory}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  Valider l'inventaire
                </button>
              </div>
            </>
          )}

          {currentInventoryId && counts.length === 0 && !loading && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun produit en stock dans cette boutique</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
