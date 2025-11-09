import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Package, Tag, Barcode, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  selling_price: number;
  cost_price: number;
  image_url: string | null;
  min_stock_level: number;
  is_active: boolean;
  category_id: string | null;
  shop_id?: string | null;
  brand?: string;
  model?: string;
  capacity?: string;
  size?: string;
  color?: string;
  weight?: number;
  expiry_date?: string;
  retail_price?: number;
  semi_wholesale_price?: number;
  wholesale_price?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

interface ProductModalProps {
  product: Product | null;
  categories: Category[];
  shops: Shop[];
  onClose: () => void;
  onSave: () => void;
}

export default function ProductModal({ product, categories, shops, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    shop_id: product?.shop_id || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    selling_price: product?.selling_price || 0,
    cost_price: product?.cost_price || 0,
    min_stock_level: product?.min_stock_level || 5,
    initial_quantity: 0, // Stock initial uniquement pour création
    is_active: product?.is_active ?? true,
    retail_price: product?.retail_price || 0,
    semi_wholesale_price: product?.semi_wholesale_price || 0,
    wholesale_price: product?.wholesale_price || 0,
    brand: product?.brand || '',
    model: product?.model || '',
    capacity: product?.capacity || '',
    size: product?.size || '',
    color: product?.color || '',
    weight: product?.weight || 0,
    expiry_date: product?.expiry_date || '',
  });
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [saving, setSaving] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('public').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      // Extraire initial_quantity du formData (n'est pas dans la table products)
      const { initial_quantity, ...productFields } = formData;

      const productData = {
        ...productFields,
        image_url: imageUrl || null,
        tenant_id: userData?.tenant_id || null,
        category_id: formData.category_id || null,
      };

      if (product) {
        // Mode édition
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        // Mode création
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        // Créer le stock initial si quantité > 0 et boutique sélectionnée
        if (newProduct && initial_quantity > 0 && formData.shop_id) {
          // Créer l'entrée inventory
          const { error: invError } = await supabase
            .from('inventory')
            .insert([{
              shop_id: formData.shop_id,
              product_id: newProduct.id,
              quantity: initial_quantity,
            }]);

          if (invError) {
            console.error('Inventory error:', invError);
            // Ne pas bloquer la création du produit
          }

          // Créer un mouvement de stock
          await supabase
            .from('stock_movements')
            .insert([{
              shop_id: formData.shop_id,
              product_id: newProduct.id,
              movement_type: 'INITIAL',
              quantity: initial_quantity,
              reference_type: 'PRODUCT_CREATION',
              reference_id: newProduct.id,
              notes: 'Stock initial lors de la création du produit',
              created_by: user.id,
            }]);
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Erreur lors de l'enregistrement du produit: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image du produit</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="Product" className="w-24 h-24 rounded-lg object-cover" />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                <div className="cursor-pointer px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm text-gray-600">{uploading ? 'Téléchargement...' : 'Choisir une image'}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit *</label>
              <input type="text" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="iPhone 15 Pro Max" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Description détaillée du produit..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
              <select value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">Sans catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Boutique</label>
              <select value={formData.shop_id}
                onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">Toutes les boutiques</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Si non spécifié, le produit sera disponible dans toutes les boutiques</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="SKU-001" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code-barre</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="123456789" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix de vente * (F CFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="number" required min="0" step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="50000" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix d'achat (F CFA)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="number" min="0" step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="40000" />
              </div>
            </div>

            <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Prix Suggérés par Type de Client (Optionnel)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Particulier (F CFA)</label>
                  <input type="number" min="0" step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Prix détail" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Demi-Grossiste (F CFA)</label>
                  <input type="number" min="0" step="0.01"
                    value={formData.semi_wholesale_price}
                    onChange={(e) => setFormData({ ...formData, semi_wholesale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Prix demi-gros" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Grossiste (F CFA)</label>
                  <input type="number" min="0" step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Prix de gros" />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Ces prix seront affichés comme suggestions dans le POS selon le type de client sélectionné. Le vendeur pourra toujours saisir un prix différent.
              </p>
            </div>

            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Attributs Produit (Optionnel)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
                  <input type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Apple, Samsung, Huawei..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modèle</label>
                  <input type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="iPhone 14 Pro Max..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacité</label>
                  <input type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="128GB, 256GB, 1L..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                  <input type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Noir, Blanc, Bleu..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taille</label>
                  <input type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="XL, 42, 15.6&quot;..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Poids (kg)</label>
                  <input type="number" min="0" step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de péremption</label>
                  <input type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Ces champs sont optionnels. Remplissez uniquement ceux pertinents pour votre type de boutique (téléphones, vêtements, alimentation, etc.).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de stock minimum</label>
              <input type="number" min="0"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="5" />
            </div>

            {/* Stock initial - uniquement en mode création */}
            {!product && (
              <div className="md:col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-green-900 mb-2">
                  <Package className="w-4 h-4 inline mr-2" />
                  Stock initial (Optionnel)
                </label>
                <div className="flex items-start gap-3">
                  <input 
                    type="number" 
                    min="0"
                    value={formData.initial_quantity}
                    onChange={(e) => setFormData({ ...formData, initial_quantity: parseInt(e.target.value) || 0 })}
                    disabled={!formData.shop_id}
                    className="flex-1 px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Quantité initiale" 
                  />
                  <div className="flex-1">
                    <p className="text-xs text-green-700">
                      {formData.shop_id ? (
                        <>
                          ✅ Le stock sera créé automatiquement pour la boutique sélectionnée
                        </>
                      ) : (
                        <>
                          ⚠️ Sélectionnez une boutique pour définir le stock initial
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary" />
                <span className="text-sm font-medium text-gray-700">Produit actif</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
