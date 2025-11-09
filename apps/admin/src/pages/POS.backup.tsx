import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  X,
  Check,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  image_url: string | null;
  category?: { name: string };
  available_stock?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentShop, setCurrentShop] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
          .select(`*, category:categories(name)`)
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

  function addToCart(product: Product) {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < (product.available_stock || 0)) {
        updateQuantity(product.id, existingItem.quantity + 1);
      }
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        subtotal: product.base_price,
      }]);
    }
  }

  function updateQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const maxQty = item.product.available_stock || 0;
        const qty = Math.min(newQuantity, maxQty);
        return {
          ...item,
          quantity: qty,
          subtotal: qty * item.product.base_price,
        };
      }
      return item;
    }));
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (!currentShop) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Vous devez être assigné à une boutique pour accéder au POS</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Point de Vente - {currentShop.name}</h2>
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

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors text-left"
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 truncate">{product.category?.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-primary">{product.base_price.toLocaleString()} F</span>
                  <span className="text-xs text-gray-500">Stock: {product.available_stock}</span>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun produit disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">Panier</h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-600 hover:text-red-800 text-sm">
                Vider
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600">{cart.length} article{cart.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Panier vide</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">{item.product.base_price.toLocaleString()} F</p>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded hover:bg-gray-100"
                        disabled={item.quantity >= (item.product.available_stock || 0)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold text-gray-900">{item.subtotal.toLocaleString()} F</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{subtotal.toLocaleString()} F</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{total.toLocaleString()} F</span>
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Payer
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          cart={cart}
          total={total}
          shopId={currentShop.id}
          onClose={() => setShowPaymentModal(false)}
          onComplete={() => {
            setShowPaymentModal(false);
            clearCart();
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Payment Modal Component
function PaymentModal({
  cart,
  total,
  shopId,
  onClose,
  onComplete,
}: {
  cart: CartItem[];
  total: number;
  shopId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');
  const [amountPaid, setAmountPaid] = useState(total);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const change = amountPaid - total;

  async function handlePayment() {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const saleData = {
        shop_id: shopId,
        user_id: user.id,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        subtotal: total,
        discount: 0,
        tax: 0,
        total_amount: total,
        amount_paid: amountPaid,
        change_amount: change,
        payment_method: paymentMethod,
        status: 'completed',
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        quantity: item.quantity,
        unit_price: item.product.base_price,
        discount: 0,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      alert('Vente enregistrée avec succès !');
      onComplete();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Paiement</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-primary bg-opacity-10 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Total à payer</p>
            <p className="text-3xl font-bold text-primary">{total.toLocaleString()} F</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode de paiement</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'mobile_money', 'card'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-lg border-2 transition-colors text-sm ${
                    paymentMethod === method
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {method === 'cash' ? 'Espèces' : method === 'mobile_money' ? 'Mobile Money' : 'Carte'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant reçu</label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {change > 0 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-700">Monnaie à rendre</p>
              <p className="text-2xl font-bold text-green-700">{change.toLocaleString()} F</p>
            </div>
          )}

          {change < 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-red-700">Montant insuffisant</p>
              <p className="text-lg font-bold text-red-700">{Math.abs(change).toLocaleString()} F manquant</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du client (optionnel)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Nom du client"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone (optionnel)</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+225 XX XX XX XX XX"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handlePayment}
            disabled={processing || change < 0}
            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Valider
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
