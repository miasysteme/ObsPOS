import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  ShoppingCart,
  Search,
  Trash2,
  CreditCard,
  X,
  Edit2,
  Users,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
// TODO: Intégrer ces composants dans la prochaine itération
// import CustomerSelectModal from '../components/pos/CustomerSelectModal';
// import CashPaymentModal from '../components/pos/CashPaymentModal';
// import ReceiptModal from '../components/pos/ReceiptModal';
// import SalesHistoryPanel from '../components/pos/SalesHistoryPanel';

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  wholesale_price: number | null;
  semi_wholesale_price: number | null;
  retail_price: number | null;
  image_url: string | null;
  category?: { name: string };
  available_stock?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface CustomerType {
  code: string;
  name: string;
}

const CUSTOMER_TYPES: CustomerType[] = [
  { code: 'RETAIL', name: 'Particulier' },
  { code: 'SEMI_WHOLESALE', name: 'Demi-Grossiste' },
  { code: 'WHOLESALE', name: 'Grossiste' },
];

// TODO: Interface Customer pour prochaine itération
// interface Customer {
//   id: string;
//   name: string;
//   email: string | null;
//   phone: string;
//   customer_type: string;
//   credit_limit: number;
//   current_balance: number;
// }

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentShop, setCurrentShop] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerType, setCustomerType] = useState<string>('RETAIL');
  
  // Modal pour saisir le prix
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // Modal pour éditer le prix dans le panier
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  // TODO: États pour fonctionnalités avancées (prochaine itération)
  // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  // const [showCustomerModal, setShowCustomerModal] = useState(false);
  // const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  // const [discountValue, setDiscountValue] = useState<number>(0);
  // const [showCashModal, setShowCashModal] = useState(false);
  // const [showReceiptModal, setShowReceiptModal] = useState(false);
  // const [lastSale, setLastSale] = useState<any>(null);
  // const [activeView, setActiveView] = useState<'pos' | 'history'>('pos');
  // const [dailyStats, setDailyStats] = useState({ sales: 0, revenue: 0, items: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('shop_id, shop:shops(id, name)')
        .eq('id', user.id)
        .single();

      const shop = Array.isArray(userData?.shop) ? userData.shop[0] : userData?.shop;
      
      if (shop?.id) {
        setCurrentShop(shop);

        const { data: productsData } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(name)
          `)
          .eq('is_active', true)
          .order('name');

        if (productsData) {
          const productsWithStock = await Promise.all(
            productsData.map(async (product: any) => {
              const { data: inventoryData } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('shop_id', shop.id)
                .eq('product_id', product.id)
                .single();

              return {
                ...product,
                available_stock: inventoryData?.quantity || 0,
              };
            })
          );

          setProducts(productsWithStock.filter(p => p.available_stock > 0));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSuggestedPrice(product: Product, custType: string): number {
    switch (custType) {
      case 'WHOLESALE':
        return product.wholesale_price || product.selling_price;
      case 'SEMI_WHOLESALE':
        return product.semi_wholesale_price || product.selling_price;
      case 'RETAIL':
        return product.retail_price || product.selling_price;
      default:
        return product.selling_price;
    }
  }

  function openPriceModal(product: Product) {
    setSelectedProduct(product);
    const suggested = getSuggestedPrice(product, customerType);
    setCustomPrice(suggested.toString());
    setQuantity(1);
    setShowPriceModal(true);
  }

  function addToCart() {
    if (!selectedProduct || !customPrice || parseFloat(customPrice) <= 0) {
      alert('Veuillez saisir un prix valide');
      return;
    }

    const existingItem = cart.find(item => item.product.id === selectedProduct.id);
    const unitPrice = parseFloat(customPrice);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > (selectedProduct.available_stock || 0)) {
        alert('Stock insuffisant');
        return;
      }
      
      setCart(cart.map(item =>
        item.product.id === selectedProduct.id
          ? {
              ...item,
              quantity: newQuantity,
              unit_price: unitPrice,
              subtotal: unitPrice * newQuantity,
            }
          : item
      ));
    } else {
      if (quantity > (selectedProduct.available_stock || 0)) {
        alert('Stock insuffisant');
        return;
      }

      setCart([...cart, {
        product: selectedProduct,
        quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * quantity,
      }]);
    }

    setShowPriceModal(false);
    setSelectedProduct(null);
    setCustomPrice('');
    setQuantity(1);
  }

  function openEditPriceModal(item: CartItem) {
    setEditingCartItem(item);
    setEditPrice(item.unit_price.toString());
  }

  function updateCartItemPrice() {
    if (!editingCartItem || !editPrice || parseFloat(editPrice) <= 0) {
      alert('Veuillez saisir un prix valide');
      return;
    }

    const newPrice = parseFloat(editPrice);
    setCart(cart.map(item =>
      item.product.id === editingCartItem.product.id
        ? {
            ...item,
            unit_price: newPrice,
            subtotal: newPrice * item.quantity,
          }
        : item
    ));

    setEditingCartItem(null);
    setEditPrice('');
  }

  function updateQuantity(productId: string, newQuantity: number) {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > (item.product.available_stock || 0)) {
      alert('Stock insuffisant');
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity, subtotal: item.unit_price * newQuantity }
        : item
    ));
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.product.id !== productId));
  }

  async function processPayment(paymentMethod: string) {
    if (cart.length === 0 || !currentShop) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

      // ✅ CORRECTION 1: Créer la vente
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            shop_id: currentShop.id,
            total_amount: total,
            payment_method: paymentMethod,
            customer_type: customerType,
            status: 'completed',
            // customer_id: à ajouter quand fonctionnalité client sera implémentée
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      // ✅ CORRECTION 2: Créer les sale_items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // ✅ CORRECTION 3: Décrémenter le stock dans inventory
      for (const item of cart) {
        // Récupérer le stock actuel
        const { data: currentStock } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('shop_id', currentShop.id)
          .eq('product_id', item.product.id)
          .single();

        if (currentStock) {
          const newQuantity = currentStock.quantity - item.quantity;
          
          const { error: stockError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('shop_id', currentShop.id)
            .eq('product_id', item.product.id);

          if (stockError) {
            console.error('Stock update error:', stockError);
            // Ne pas bloquer la vente mais log l'erreur
          }
        }

        // ✅ CORRECTION 4: Créer mouvement de stock
        await supabase
          .from('stock_movements')
          .insert([{
            shop_id: currentShop.id,
            product_id: item.product.id,
            movement_type: 'SALE',
            quantity: -item.quantity,
            reference_type: 'SALE',
            reference_id: saleData.id,
            notes: `Vente ticket #${saleData.id}`,
            created_by: user.id,
          }]);
      }

      alert(`✅ Vente enregistrée avec succès !\nTicket: ${saleData.id}\nTotal: ${total.toLocaleString()} FCFA`);
      setCart([]);
      setShowPaymentModal(false);
      loadData(); // Recharger produits pour mettre à jour stock
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`❌ Erreur lors du paiement: ${error.message}`);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculs panier (remise désactivée temporairement)
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  // TODO: Réactiver remise dans prochaine itération
  // const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  // const discountAmount = discountType === 'PERCENTAGE' 
  //   ? (subtotal * discountValue) / 100
  //   : discountType === 'FIXED' ? discountValue : 0;
  // const totalAmount = Math.max(0, subtotal - discountAmount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header avec Type de Client */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point de Vente</h1>
            <p className="text-sm text-gray-600">{currentShop?.name}</p>
          </div>
          
          {/* Sélecteur Type de Client */}
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {CUSTOMER_TYPES.map(type => (
                <button
                  key={type.code}
                  onClick={() => setCustomerType(type.code)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    customerType === type.code
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 bg-white border-b border-gray-200">
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

          {/* Products */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => openPriceModal(product)}
                  className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all p-4 text-left"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                  
                  {/* Prix masqué - Afficher uniquement le stock */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      Stock: {product.available_stock}
                    </span>
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <ShoppingCart className="w-5 h-5" />
              Panier ({totalItems})
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Panier vide</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">{item.product.sku}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <button
                        onClick={() => openEditPriceModal(item)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        {item.unit_price.toLocaleString()} FCFA/u
                      </button>
                      <span className="font-bold text-gray-900">
                        {item.subtotal.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{totalAmount.toLocaleString()} FCFA</span>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Passer au paiement
            </button>
          </div>
        </div>
      </div>

      {/* Modal Saisie Prix */}
      {showPriceModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Prix de Vente</h3>
              <button
                onClick={() => setShowPriceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
              <p className="text-sm text-gray-500">Stock disponible: {selectedProduct.available_stock}</p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Prix suggéré pour {CUSTOMER_TYPES.find(t => t.code === customerType)?.name}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {getSuggestedPrice(selectedProduct, customerType).toLocaleString()} FCFA
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix convenu (FCFA) *
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Saisir le prix"
                  min="0"
                  step="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  min="1"
                  max={selectedProduct.available_stock || 0}
                />
              </div>

              {customPrice && parseFloat(customPrice) > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Sous-total</p>
                  <p className="text-xl font-bold text-green-600">
                    {(parseFloat(customPrice) * quantity).toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPriceModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addToCart}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Prix Panier */}
      {editingCartItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Modifier le Prix</h3>
              <button
                onClick={() => setEditingCartItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{editingCartItem.product.name}</p>
              <p className="text-sm text-gray-500">Quantité: {editingCartItem.quantity}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau prix unitaire (FCFA)
              </label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Saisir le nouveau prix"
                min="0"
                step="100"
              />
            </div>

            {editPrice && parseFloat(editPrice) > 0 && (
              <div className="p-3 bg-green-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Nouveau sous-total</p>
                <p className="text-xl font-bold text-green-600">
                  {(parseFloat(editPrice) * editingCartItem.quantity).toLocaleString()} FCFA
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditingCartItem(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={updateCartItemPrice}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Méthode de Paiement</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total à payer</p>
              <p className="text-3xl font-bold text-primary">
                {totalAmount.toLocaleString()} FCFA
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Type de client: {CUSTOMER_TYPES.find(t => t.code === customerType)?.name}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => processPayment('cash')}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                💵 Espèces
              </button>
              <button
                onClick={() => processPayment('mobile_money')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📱 Mobile Money
              </button>
              <button
                onClick={() => processPayment('card')}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                💳 Carte Bancaire
              </button>
              <button
                onClick={() => processPayment('credit')}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                title="À implémenter avec sélection client"
              >
                💰 À Crédit (Client)
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
