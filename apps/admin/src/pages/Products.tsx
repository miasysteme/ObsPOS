import { useState, useEffect } from 'react';
import { supabase, getUserRole } from '../lib/supabase';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Tag,
  Box,
  TrendingDown,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import ProductModal from '../components/products/ProductModal';
import CategoryModal from '../components/products/CategoryModal';
import StockModal from '../components/products/StockModal';
import ImportExportModal from '../components/products/ImportExportModal';

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

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
  category?: { name: string };
  total_stock?: number;
  low_stock_count?: number;
}

interface Shop {
  id: string;
  name: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [roleInfo, setRoleInfo] = useState<{ role?: string; tenant_id?: string; shop_id?: string } | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState<'tenant' | 'shop'>('shop');
  const [selectedShopForDelete, setSelectedShopForDelete] = useState<string>('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const roleData = await getUserRole();
      setRoleInfo(roleData);
      const tenantId = roleData?.tenant_id;
      const role = roleData?.role;
      const isSuperAdmin = role === 'super_admin';

      if (!roleData) {
        setProducts([]);
        setCategories([]);
        setShops([]);
        return;
      }

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      setCategories(categoriesData || []);

      let shopsQuery = supabase
        .from('shops')
        .select('id, name, tenant_id')
        .order('name');

      if (!isSuperAdmin && tenantId) {
        shopsQuery = shopsQuery.eq('tenant_id', tenantId);
      }

      const { data: shopsData } = await shopsQuery;
      const simplifiedShops = (shopsData || []).map((shop: any) => ({ id: shop.id, name: shop.name }));
      setShops(simplifiedShops);
      setSelectedShopForDelete((prev) => prev || simplifiedShops[0]?.id || '');

      let productsQuery = supabase
        .from('products')
        .select(`*, category:categories(name)`)
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && tenantId) {
        productsQuery = productsQuery.eq('tenant_id', tenantId);
      }

      const { data: productsData, error } = await productsQuery;

      if (error) throw error;

      if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
        setProducts([]);
        return;
      }

      const productIds = productsData
        .map((product: any) => product.id)
        .filter((id: string | null | undefined) => typeof id === 'string');

      if (productIds.length === 0) {
        setProducts([]);
        return;
      }

      let inventoryQuery = supabase
        .from('inventory')
        .select('product_id, quantity, shop_id')
        .in('product_id', productIds);

      if (!isSuperAdmin && simplifiedShops.length > 0) {
        const tenantShopIds = simplifiedShops.map((shop) => shop.id);
        inventoryQuery = inventoryQuery.in('shop_id', tenantShopIds);
      }

      const { data: inventoryRows, error: inventoryError } = await inventoryQuery;

      if (inventoryError) throw inventoryError;

      const inventoryByProduct = new Map<string, { total: number; quantities: number[] }>();
      inventoryRows?.forEach((row: any) => {
        const existing = inventoryByProduct.get(row.product_id) || { total: 0, quantities: [] };
        const quantity = row.quantity || 0;
        inventoryByProduct.set(row.product_id, {
          total: existing.total + quantity,
          quantities: [...existing.quantities, quantity],
        });
      });

      const productsWithStock = productsData.map((product: any) => {
        const inventoryInfo = inventoryByProduct.get(product.id) || { total: 0, quantities: [] };
        const minStockLevel = product.min_stock_level || 0;
        const lowStockCount = inventoryInfo.quantities.filter((qty) => qty < minStockLevel).length;

        return {
          ...product,
          total_stock: inventoryInfo.total,
          low_stock_count: lowStockCount,
        };
      });

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error loading data:', error);
      setProducts([]);
      setCategories([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erreur lors de la suppression du produit');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category_id === filterCategory;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && product.is_active) ||
      (filterStatus === 'inactive' && !product.is_active) ||
      (filterStatus === 'low_stock' && (product.low_stock_count || 0) > 0);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    inactive: products.filter((p) => !p.is_active).length,
    lowStock: products.filter((p) => (p.low_stock_count || 0) > 0).length,
  };

  const canBulkDelete = !!roleInfo && ['super_admin', 'owner', 'admin', 'manager'].includes(roleInfo.role || '');

  useEffect(() => {
    if (!selectedShopForDelete && shops.length > 0) {
      setSelectedShopForDelete(shops[0].id);
    }
  }, [shops, selectedShopForDelete]);

  function openBulkDeleteModal() {
    setBulkDeleteScope('shop');
    setShowBulkDeleteModal(true);
  }

  async function handleBulkDelete() {
    if (!roleInfo?.tenant_id) {
      alert("Impossible de déterminer l'établissement pour la suppression");
      return;
    }

    const deleteAll = bulkDeleteScope === 'tenant';
    if (!deleteAll && !selectedShopForDelete) {
      alert('Veuillez sélectionner une boutique');
      return;
    }

    const confirmationMessage = deleteAll
      ? "Cette action supprimera définitivement tous les produits de l'établissement. Confirmez-vous ?"
      : 'Cette action supprimera définitivement tous les produits de la boutique sélectionnée. Confirmez-vous ?';

    if (!confirm(confirmationMessage)) {
      return;
    }

    try {
      setBulkDeleting(true);
      const { data, error } = await supabase.rpc('delete_products_bulk', {
        target_tenant_id: roleInfo.tenant_id,
        target_shop_id: deleteAll ? null : selectedShopForDelete,
        delete_all_shops: deleteAll,
      });

      if (error) throw error;

      const deletedCount = data || 0;
      await loadData();
      setShowBulkDeleteModal(false);
      alert(`${deletedCount} produit${deletedCount > 1 ? 's' : ''} supprimé${deletedCount > 1 ? 's' : ''}.`);
    } catch (error: any) {
      console.error('Error deleting products in bulk:', error);
      alert(`Erreur lors de la suppression en lot: ${error.message || error}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Produits</h1>
        <p className="text-gray-600 mt-2">Gérez votre catalogue de produits et leur stock</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Produits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactifs</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.lowStock}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
            <option value="low_stock">Stock bas</option>
          </select>

          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            Catégories
          </button>

          <button
            onClick={() => setShowImportExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import/Export
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un produit
          </button>

          {canBulkDelete && (
            <button
              onClick={openBulkDeleteModal}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer en lot
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover mr-3" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sku || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{product.selling_price.toLocaleString()} F</div>
                    {product.cost_price > 0 && (
                      <div className="text-gray-500 text-xs">Coût: {product.cost_price.toLocaleString()} F</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{product.total_stock || 0}</span>
                      {(product.low_stock_count || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3 mr-1" />Bas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelectedProduct(product); setShowStockModal(true); }}
                        className="text-blue-600 hover:text-blue-900 p-1" title="Gérer le stock">
                        <Box className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditingProduct(product); setShowAddModal(true); }}
                        className="text-primary hover:text-primary-dark p-1" title="Modifier">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleActive(product.id, product.is_active)}
                        className={`${product.is_active ? 'text-gray-600' : 'text-green-600'} hover:opacity-75 p-1`}
                        title={product.is_active ? 'Désactiver' : 'Activer'}>
                        {product.is_active ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 p-1" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          shops={shops}
          onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
          onSave={() => { setShowAddModal(false); setEditingProduct(null); loadData(); }}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onSave={() => { setShowCategoryModal(false); loadData(); }}
        />
      )}

      {showStockModal && selectedProduct && (
        <StockModal
          product={selectedProduct}
          shops={shops}
          onClose={() => { setShowStockModal(false); setSelectedProduct(null); }}
          onSave={() => { setShowStockModal(false); setSelectedProduct(null); loadData(); }}
        />
      )}

      {showImportExportModal && (
        <ImportExportModal
          shops={shops}
          onClose={() => setShowImportExportModal(false)}
          onImportComplete={loadData}
        />
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Suppression en lot</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Portée de la suppression</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="bulk-delete-scope"
                      value="shop"
                      checked={bulkDeleteScope === 'shop'}
                      onChange={() => setBulkDeleteScope('shop')}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Supprimer les produits d'une boutique spécifique</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="bulk-delete-scope"
                      value="tenant"
                      checked={bulkDeleteScope === 'tenant'}
                      onChange={() => setBulkDeleteScope('tenant')}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Supprimer tous les produits de l'établissement</span>
                  </label>
                </div>
              </div>

              {bulkDeleteScope === 'shop' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Choisir la boutique</p>
                  <select
                    value={selectedShopForDelete}
                    onChange={(e) => setSelectedShopForDelete(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {shops.length === 0 && <option value="">Aucune boutique disponible</option>}
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                <p className="font-semibold mb-1">Attention</p>
                <p>Cette action est irréversible. Les produits supprimés seront retirés des stocks et des ventes associées.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={bulkDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting || (bulkDeleteScope === 'shop' && !selectedShopForDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
