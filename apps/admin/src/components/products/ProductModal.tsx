import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Upload, Package, Tag, Barcode, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  base_price: number;
  cost_price: number;
  image_url: string | null;
  min_stock_level: number;
  is_active: boolean;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface ProductModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

export default function ProductModal({ product, categories, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    base_price: product?.base_price || 0,
    cost_price: product?.cost_price || 0,
    min_stock_level: product?.min_stock_level || 5,
    is_active: product?.is_active ?? true,
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
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      const productData = {
        ...formData,
        image_url: imageUrl || null,
        tenant_id: userData?.tenant_id,
        category_id: formData.category_id || null,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erreur lors de l\'enregistrement du produit');
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
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau de stock minimum</label>
              <input type="number" min="0"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="5" />
            </div>

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
