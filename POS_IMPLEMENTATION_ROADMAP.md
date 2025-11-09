# 🎯 Feuille de Route Implémentation POS 100% Opérationnel

## ✅ Phase 1 : COMPLÉTÉE - Corrections Critiques
- [x] Décrément automatique stock après vente
- [x] Création mouvements stock_movements type SALE
- [x] Ajout option paiement crédit (préparée)
- [x] Message confirmation avec numéro ticket

## ✅ Phase 2 : COMPLÉTÉE - Migrations BDD
- [x] Ajout colonnes : ticket_number, customer_id, discount_*, amount_received, change_amount
- [x] Fonction génération numéro ticket automatique (TICKET-YYYYMMDD-####)
- [x] Trigger auto génération ticket_number
- [x] Index performances (ticket_number, customer_id, created_at)

## ✅ Phase 3 : COMPLÉTÉE - Composants Créés
- [x] CustomerSelectModal.tsx - Sélection client avec recherche
- [x] CashPaymentModal.tsx - Paiement espèces avec rendu monnaie
- [x] ReceiptModal.tsx - Reçu imprimable
- [x] SalesHistoryPanel.tsx - Historique ventes du jour avec stats

## 🔄 Phase 4 : EN COURS - Intégration dans POS.tsx

### 4.1 États Ajoutés ✅
```typescript
- selectedCustomer
- showCustomerModal
- discountType, discountValue
- showCashModal
- showReceiptModal, lastSale
- activeView (pos | history)
- dailyStats
```

### 4.2 À Intégrer dans l'Interface

#### A. Sélecteur Client (Header)
```tsx
<button onClick={() => setShowCustomerModal(true)}>
  {selectedCustomer ? (
    <span>{selectedCustomer.name}</span>
  ) : (
    <span>Sélectionner Client</span>
  )}
</button>
```

#### B. Section Remise (Panier)
```tsx
<div className="remise-section">
  <select onChange={(e) => setDiscountType(e.target.value)}>
    <option value="NONE">Aucune remise</option>
    <option value="PERCENTAGE">Pourcentage (%)</option>
    <option value="FIXED">Montant fixe</option>
  </select>
  {discountType !== 'NONE' && (
    <input 
      type="number" 
      value={discountValue}
      onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
    />
  )}
  <p>Remise: -{discountAmount.toLocaleString()} FCFA</p>
</div>
```

#### C. Stats Quotidiennes (Header)
```tsx
<div className="stats-cards">
  <div>CA: {dailyStats.revenue.toLocaleString()}</div>
  <div>Ventes: {dailyStats.sales}</div>
  <div>Articles: {dailyStats.items}</div>
</div>
```

#### D. Onglets Vue (POS / Historique)
```tsx
<div className="tabs">
  <button onClick={() => setActiveView('pos')}>Point de Vente</button>
  <button onClick={() => setActiveView('history')}>Historique</button>
</div>

{activeView === 'pos' ? (
  // Interface POS actuelle
) : (
  <SalesHistoryPanel 
    shopId={currentShop.id}
    onViewReceipt={handleViewReceipt}
  />
)}
```

### 4.3 Modifications Fonction processPayment

```typescript
async function processPayment(paymentMethod: string, amountReceived?: number) {
  // Validation crédit si nécessaire
  if (paymentMethod === 'credit' && !selectedCustomer) {
    alert('Sélectionnez un client pour le paiement à crédit');
    return;
  }

  if (paymentMethod === 'credit' && selectedCustomer) {
    const newBalance = selectedCustomer.current_balance + totalAmount;
    if (newBalance > selectedCustomer.credit_limit) {
      alert(`Limite crédit dépassée !`);
      return;
    }
  }

  // Créer vente avec tous les champs
  const { data: saleData } = await supabase
    .from('sales')
    .insert([{
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
    }])
    .select()
    .single();

  // Sale items...
  // Stock update...
  // Stock movements...

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
  }

  // Afficher reçu
  setLastSale({
    ...saleData,
    items: cart.map(item => ({
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
  });
  setShowReceiptModal(true);
  
  // Reset
  setCart([]);
  setDiscountType('NONE');
  setDiscountValue(0);
  setSelectedCustomer(null);
  loadDailyStats();
}
```

### 4.4 Gestion Paiement Modal

```typescript
function handlePaymentMethodSelect(method: string) {
  if (method === 'cash') {
    setShowPaymentModal(false);
    setShowCashModal(true);
  } else {
    processPayment(method);
  }
}

function handleCashConfirm(amountReceived: number) {
  setShowCashModal(false);
  processPayment('cash', amountReceived);
}
```

### 4.5 Fonction Chargement Stats

```typescript
async function loadDailyStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('sales')
    .select('total_amount, sale_items(quantity)')
    .eq('shop_id', currentShop.id)
    .gte('created_at', today.toISOString());

  const revenue = data?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
  const items = data?.reduce((sum, s) => {
    const count = s.sale_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
    return sum + count;
  }, 0) || 0;

  setDailyStats({
    sales: data?.length || 0,
    revenue,
    items,
  });
}
```

## 🎯 Phase 5 : Tests et Validation
- [ ] Test création vente avec client
- [ ] Test paiement espèces avec rendu monnaie
- [ ] Test paiement crédit avec validation limite
- [ ] Test remise pourcentage et fixe
- [ ] Test génération numéro ticket
- [ ] Test affichage reçu
- [ ] Test historique ventes du jour
- [ ] Test impression reçu
- [ ] Test stats en temps réel

## 🚀 Phase 6 : Fonctionnalités Bonus (Optionnel)
- [ ] Filtres par catégorie produits
- [ ] Raccourcis clavier (F1-F3, Escape)
- [ ] Scan code-barre automatique
- [ ] Multi-paiement (Espèces + Mobile Money)
- [ ] Remboursement vente
- [ ] Export PDF reçu avec jsPDF
- [ ] Mode hors ligne avec LocalStorage

## 📝 Notes d'Implémentation

### Ordre Recommandé
1. Terminer intégration UI (Header, Panier, Modales)
2. Tester workflow complet vente
3. Valider génération tickets et reçus
4. Ajouter historique et stats
5. Tests utilisateurs réels
6. Optimisations performances

### Points d'Attention
- Validation crédit client AVANT création vente
- Numéro ticket généré par trigger BDD
- Stock décrémenté dans transaction
- Reçu affiché APRÈS succès vente
- Stats rechargées après chaque vente

### Performance
- Index BDD déjà créés ✅
- Requêtes optimisées avec select()
- Chargement stats async
- Pagination historique si > 100 ventes
