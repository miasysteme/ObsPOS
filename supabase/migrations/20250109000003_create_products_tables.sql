-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) DEFAULT 0,
  image_url TEXT,
  min_stock_level INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Product Variations Table (for colors, sizes, etc.)
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  last_restock_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, product_id)
);

-- Create Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
  quantity INTEGER NOT NULL,
  reference VARCHAR(255),
  notes TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_shop ON inventory(shop_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_stock_movements_shop ON stock_movements(shop_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- RLS Policies for Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to categories"
ON categories FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Owners can manage their categories"
ON categories FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Managers and cashiers can view categories"
ON categories FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- RLS Policies for Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to products"
ON products FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Owners can manage their products"
ON products FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Managers and cashiers can view products"
ON products FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- RLS Policies for Inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to inventory"
ON inventory FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Owners can manage inventory"
ON inventory FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = inventory.shop_id
    AND shops.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Managers can view and update inventory of their shop"
ON inventory FOR SELECT TO authenticated
USING (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Managers can update inventory of their shop"
ON inventory FOR UPDATE TO authenticated
USING (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
);

-- RLS Policies for Stock Movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock movements of their shop"
ON stock_movements FOR SELECT TO authenticated
USING (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = stock_movements.shop_id
    AND shops.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Managers can create stock movements"
ON stock_movements FOR INSERT TO authenticated
WITH CHECK (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = stock_movements.shop_id
    AND shops.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

-- Comments
COMMENT ON TABLE categories IS 'Product categories with hierarchical support';
COMMENT ON TABLE products IS 'Products catalog with pricing and stock management';
COMMENT ON TABLE inventory IS 'Stock levels by shop and product';
COMMENT ON TABLE stock_movements IS 'History of all stock movements';
