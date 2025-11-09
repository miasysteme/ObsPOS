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
  User,
  TrendingUp,
  Package,
  History,
  Tag,
  Receipt,
} from 'lucide-react';
import CustomerSelectModal from '../components/pos/CustomerSelectModal';
import CashPaymentModal from '../components/pos/CashPaymentModal';
import ReceiptModal from '../components/pos/ReceiptModal';
import SalesHistoryPanel from '../components/pos/SalesHistoryPanel';

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

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  customer_type: string;
  credit_limit: number;
  current_balance: number;
}

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

  // États pour fonctionnalités avancées
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [activeView, setActiveView] = useState<'pos' | 'history'>('pos');
  const [dailyStats, setDailyStats] = useState({ sales: 0, revenue: 0, items: 0 });

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
        
        // Charger les stats quotidiennes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: salesData } = await supabase
          .from('sales')
          .select('total_amount, sale_items(quantity)')
          .eq('shop_id', shop.id)
          .gte('created_at', today.toISOString());
        
        const revenue = salesData?.reduce((sum: any, s: any) => sum + s.total_amount, 0) || 0;
        const items = salesData?.reduce((sum: any, s: any) => {
          const count = s.sale_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
          return sum + count;
        }, 0) || 0;
        
        setDailyStats({
          sales: salesData?.length || 0,
          revenue,
          items,
        });

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

  async function loadDailyStats() {
    if (!currentShop) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('sales')
      .select('total_amount, sale_items(quantity)')
      .eq('shop_id', currentShop.id)
      .gte('created_at', today.toISOString());

    const revenue = data?.reduce((sum: any, s: any) => sum + s.total_amount, 0) || 0;
    const items = data?.reduce((sum: any, s: any) => {
      const count = s.sale_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
      return sum + count;
    }, 0) || 0;

    setDailyStats({
      sales: data?.length || 0,
      revenue,
      items,
    });
  }

  function handlePaymentMethodSelect(method: string, amountReceived?: number) {
    // Validation crédit
    if (method === 'credit' && !selectedCustomer) {
      alert('⚠️ Veuillez sélectionner un client pour le paiement à crédit');
      return;
    }
    
    if (method === 'credit' && selectedCustomer) {
      const newBalance = selectedCustomer.current_balance + totalAmount;
      if (newBalance > selectedCustomer.credit_limit) {
        alert(`❌ Limite crédit dépassée !\n\nActuel: ${selectedCustomer.current_balance.toLocaleString()} FCFA\nLimite: ${selectedCustomer.credit_limit.toLocaleString()} FCFA\nNouveau total: ${newBalance.toLocaleString()} FCFA`);
        return;
      }
    }
    
    // Espèces → Modal rendu monnaie
    if (method === 'cash' && !amountReceived) {
      setShowPaymentModal(false);
      setShowCashModal(true);
    } else {
      processPayment(method, amountReceived);
    }
  }

  function handleCashConfirm(amountReceived: number) {
    setShowCashModal(false);
    handlePaymentMethodSelect('cash', amountReceived);
  }

  async function loadSaleAndShowReceipt(saleId: string) {
    try {
      const { data: sale } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sale_items(*, product:products(name))
        `)
        .eq('id', saleId)
        .single();
      
      if (sale) {
        setLastSale({
          ...sale,
          items: sale.sale_items?.map((item: any) => ({
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          })),
        });
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error loading sale:', error);
      alert('Erreur lors du chargement de la vente');
    }
  }

  async function processPayment(paymentMethod: string, amountReceived?: number) {
    if (cart.length === 0 || !currentShop) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Créer la vente avec tous les nouveaux champs
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            shop_id: currentShop.id,
            customer_id: selectedCustomer?.id || null,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            customer_type: customerType,
            status: 'completed',
            subtotal_before_discount: subtotal,
            discount_type: discountType,
            discount_value: discountValue,
            discount_amount: discountAmount,
            amount_received: amountReceived || null,
            change_amount: amountReceived ? (amountReceived - totalAmount) : null,
            // ticket_number généré automatiquement par trigger
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
            notes: `Vente ticket ${saleData.ticket_number || saleData.id}`,
            created_by: user.id,
          }]);
      }

      // Si crédit, mettre à jour customer_credit_history
      if (paymentMethod === 'credit' && selectedCustomer) {
        await supabase.from('customer_credit_history').insert([{
          customer_id: selectedCustomer.id,
          sale_id: saleData.id,
          amount: totalAmount,
          type: 'CREDIT',
          balance_before: selectedCustomer.current_balance,
          balance_after: selectedCustomer.current_balance + totalAmount,
        }]);
        
        // Mettre à jour current_balance du client
        await supabase
          .from('customers')
          .update({ 
            current_balance: selectedCustomer.current_balance + totalAmount 
          })
          .eq('id', selectedCustomer.id);
      }

      // Préparer données reçu
      setLastSale({
        ...saleData,
        customer: selectedCustomer ? { name: selectedCustomer.name } : null,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      });

      // Reset et afficher reçu
      setCart([]);
      setDiscountType('NONE');
      setDiscountValue(0);
      setSelectedCustomer(null);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      
      await loadDailyStats(); // Recharger stats
      await loadData(); // Recharger produits
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(`❌ Erreur lors du paiement: ${error.message}`);
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculs panier avec remise
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = discountType === 'PERCENTAGE' 
    ? (subtotal * discountValue) / 100
    : discountType === 'FIXED' ? discountValue : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point de Vente</h1>
            <p className="text-sm text-gray-600">{currentShop?.name}</p>
          </div>
          
          {/* Stats Quotidiennes */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">CA:</span>
              <span className="font-semibold text-green-600">
                {dailyStats.revenue.toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Ventes:</span>
              <span className="font-semibold text-blue-600">{dailyStats.sales}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600">Articles:</span>
              <span className="font-semibold text-purple-600">{dailyStats.items}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Sélecteur Client */}
          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <User className="w-5 h-5" />
            {selectedCustomer ? (
              <span>{selectedCustomer.name}</span>
            ) : (
              <span className="text-gray-600">Sélectionner Client</span>
            )}
          </button>

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

      {/* Onglets Vue */}
      <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setActiveView('pos')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'pos'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Point de Vente
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeView === 'history'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <History className="w-4 h-4" />
          Historique
        </button>
      </div>

      {activeView === 'pos' ? (
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

          {/* Section Remise */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Remise
                </span>
                <select 
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="NONE">Aucune</option>
                  <option value="PERCENTAGE">Pourcentage (%)</option>
                  <option value="FIXED">Montant Fixe</option>
                </select>
              </div>
              
              {discountType !== 'NONE' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={discountType === 'PERCENTAGE' ? 'Ex: 10' : 'Ex: 5000'}
                    min="0"
                    step={discountType === 'PERCENTAGE' ? '1' : '1000'}
                  />
                  <span className="text-sm text-gray-600">
                    {discountType === 'PERCENTAGE' ? '%' : 'FCFA'}
                  </span>
                </div>
              )}
              
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-green-600 font-medium text-sm">
                  <span>Remise appliquée</span>
                  <span>-{discountAmount.toLocaleString()} FCFA</span>
                </div>
              )}
            </div>
          )}

          <div className="p-4 border-t border-gray-200 space-y-2">
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString()} FCFA</span>
              </div>
            )}
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
      ) : (
        /* Vue Historique */
        <div className="p-6">
          <SalesHistoryPanel
            shopId={currentShop.id}
            onViewReceipt={(saleId) => loadSaleAndShowReceipt(saleId)}
            onRefund={(_saleId) => {
              // TODO: Implémenter remboursement
              alert('Remboursement à implémenter');
            }}
          />
        </div>
      )}

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
                onClick={() => handlePaymentMethodSelect('cash')}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                💵 Espèces
              </button>
              <button
                onClick={() => handlePaymentMethodSelect('mobile_money')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📱 Mobile Money
              </button>
              <button
                onClick={() => handlePaymentMethodSelect('card')}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                💳 Carte Bancaire
              </button>
              <button
                onClick={() => handlePaymentMethodSelect('credit')}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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

      {/* Modal Sélection Client */}
      {showCustomerModal && (
        <CustomerSelectModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={(customer) => setSelectedCustomer(customer)}
          selectedCustomer={selectedCustomer}
        />
      )}

      {/* Modal Paiement Espèces */}
      {showCashModal && (
        <CashPaymentModal
          totalAmount={totalAmount}
          onClose={() => setShowCashModal(false)}
          onConfirm={handleCashConfirm}
        />
      )}

      {/* Modal Reçu */}
      {showReceiptModal && lastSale && (
        <ReceiptModal
          ticketNumber={lastSale.ticket_number}
          date={lastSale.created_at}
          shopName={currentShop.name}
          shopAddress={currentShop.address}
          shopPhone={currentShop.phone}
          customerName={lastSale.customer?.name}
          items={lastSale.items}
          subtotal={lastSale.subtotal_before_discount || lastSale.total_amount}
          discount={lastSale.discount_amount || 0}
          total={lastSale.total_amount}
          paymentMethod={lastSale.payment_method}
          amountReceived={lastSale.amount_received}
          change={lastSale.change_amount}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
