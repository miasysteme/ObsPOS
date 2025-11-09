-- PhonesPOS - Row Level Security (RLS)
-- Sécurité Multi-tenant : Isolation complète par tenant_id

-- =====================================================
-- FONCTION: Récupérer le tenant_id de l'utilisateur connecté
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- FONCTION: Vérifier si l'utilisateur est super admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- ACTIVER RLS sur toutes les tables
-- =====================================================
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_imeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: establishments
-- =====================================================
-- Super Admin : accès complet
CREATE POLICY "Super admin can view all establishments"
  ON establishments FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admin can insert establishments"
  ON establishments FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update establishments"
  ON establishments FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admin can delete establishments"
  ON establishments FOR DELETE
  USING (public.is_super_admin());

-- Owner : peut voir son propre établissement
CREATE POLICY "Owner can view own establishment"
  ON establishments FOR SELECT
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Owner can update own establishment"
  ON establishments FOR UPDATE
  USING (id = public.get_user_tenant_id());

-- =====================================================
-- RLS POLICIES: shops
-- =====================================================
CREATE POLICY "Users can view shops of their tenant"
  ON shops FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Owner and Manager can insert shops"
  ON shops FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owner and Manager can update shops"
  ON shops FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owner can delete shops"
  ON shops FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- RLS POLICIES: users
-- =====================================================
CREATE POLICY "Users can view users of their tenant"
  ON users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Owner can insert users"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owner can update users"
  ON users FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owner can delete users"
  ON users FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- RLS POLICIES: products
-- =====================================================
CREATE POLICY "Users can view products of their tenant"
  ON products FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owner and Manager can insert products"
  ON products FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Owner and Manager can update products"
  ON products FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Owner can delete products"
  ON products FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- RLS POLICIES: sales
-- =====================================================
CREATE POLICY "Users can view sales of their tenant"
  ON sales FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Cashier and Manager can insert sales"
  ON sales FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'cashier')
    )
  );

-- =====================================================
-- RLS POLICIES: stock_movements
-- =====================================================
CREATE POLICY "Users can view stock movements of their tenant"
  ON stock_movements FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Authorized users can insert stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'warehouse')
    )
  );

-- =====================================================
-- RLS POLICIES: repairs
-- =====================================================
CREATE POLICY "Users can view repairs of their tenant"
  ON repairs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Technician and Manager can insert repairs"
  ON repairs FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'technician')
    )
  );

CREATE POLICY "Technician and Manager can update repairs"
  ON repairs FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'technician')
    )
  );

-- =====================================================
-- RLS POLICIES: subscriptions
-- =====================================================
CREATE POLICY "Users can view subscriptions of their tenant"
  ON subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Super admin can manage subscriptions"
  ON subscriptions FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- RLS POLICIES: payments
-- =====================================================
CREATE POLICY "Users can view payments of their tenant"
  ON payments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "Owner can insert payments"
  ON payments FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Super admin can validate payments"
  ON payments FOR UPDATE
  USING (public.is_super_admin());

-- =====================================================
-- RLS POLICIES: audit_logs
-- =====================================================
CREATE POLICY "Users can view audit logs of their tenant"
  ON audit_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: Autres tables (categories, sale_items, etc.)
-- =====================================================
CREATE POLICY "Users can view categories of their tenant"
  ON categories FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Manager can manage categories"
  ON categories FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Users can view sale items"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND sales.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Users can view product imeis of their tenant"
  ON product_imeis FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Authorized users can manage product imeis"
  ON product_imeis FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Users can view inventory sessions of their tenant"
  ON inventory_sessions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Manager can manage inventory sessions"
  ON inventory_sessions FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'warehouse')
    )
  );

CREATE POLICY "Users can view inventory items"
  ON inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory_sessions 
      WHERE inventory_sessions.id = inventory_items.session_id 
      AND inventory_sessions.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Users can manage inventory items"
  ON inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inventory_sessions 
      WHERE inventory_sessions.id = inventory_items.session_id 
      AND inventory_sessions.tenant_id = public.get_user_tenant_id()
    )
  );
