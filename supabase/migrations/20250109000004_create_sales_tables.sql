-- Create Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2) DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'mobile_money', 'card', 'credit'
  payment_reference VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'refunded', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically update stock after sale
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease inventory quantity
  UPDATE inventory
  SET quantity = quantity - NEW.quantity
  WHERE shop_id = (SELECT shop_id FROM sales WHERE id = NEW.sale_id)
  AND product_id = NEW.product_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    shop_id,
    product_id,
    type,
    quantity,
    reference,
    user_id
  )
  SELECT
    s.shop_id,
    NEW.product_id,
    'out',
    NEW.quantity,
    'SALE-' || NEW.sale_id,
    s.user_id
  FROM sales s
  WHERE s.id = NEW.sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock after sale item is created
CREATE TRIGGER trigger_update_stock_after_sale
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_sale();

-- Function to restore stock after refund
CREATE OR REPLACE FUNCTION restore_stock_after_refund()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Restore inventory for all items in the refunded sale
    UPDATE inventory i
    SET quantity = quantity + si.quantity
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE si.sale_id = NEW.sale_id
    AND i.shop_id = s.shop_id
    AND i.product_id = si.product_id;
    
    -- Create stock movement records
    INSERT INTO stock_movements (
      shop_id,
      product_id,
      type,
      quantity,
      reference,
      user_id
    )
    SELECT
      s.shop_id,
      si.product_id,
      'in',
      si.quantity,
      'REFUND-' || NEW.id,
      NEW.user_id
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE si.sale_id = NEW.sale_id;
    
    -- Update sale status
    UPDATE sales SET status = 'refunded' WHERE id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to restore stock after refund approval
CREATE TRIGGER trigger_restore_stock_after_refund
AFTER UPDATE ON refunds
FOR EACH ROW
EXECUTE FUNCTION restore_stock_after_refund();

-- Indexes for performance
CREATE INDEX idx_sales_shop ON sales(shop_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_refunds_sale ON refunds(sale_id);

-- RLS Policies for Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins have full access to sales"
ON sales FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'super_admin'
  )
);

CREATE POLICY "Owners can view sales of their establishment"
ON sales FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shops
    INNER JOIN users ON users.tenant_id = shops.tenant_id
    WHERE shops.id = sales.shop_id
    AND users.id = auth.uid()
    AND users.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Users can view and create sales of their shop"
ON sales FOR SELECT TO authenticated
USING (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Users can create sales in their shop"
ON sales FOR INSERT TO authenticated
WITH CHECK (
  shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
);

-- RLS Policies for Sale Items
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale items of accessible sales"
ON sale_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND (
      sales.shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM shops
        INNER JOIN users ON users.tenant_id = shops.tenant_id
        WHERE shops.id = sales.shop_id
        AND users.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'super_admin'
      )
    )
  )
);

CREATE POLICY "Users can insert sale items for their shop sales"
ON sale_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND sales.shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
  )
);

-- RLS Policies for Refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refunds of their shop sales"
ON refunds FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = refunds.sale_id
    AND (
      sales.shop_id = (SELECT shop_id FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM shops
        INNER JOIN users ON users.tenant_id = shops.tenant_id
        WHERE shops.id = sales.shop_id
        AND users.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'super_admin'
      )
    )
  )
);

CREATE POLICY "Managers can create refunds"
ON refunds FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    INNER JOIN users ON users.shop_id = sales.shop_id
    WHERE sales.id = refunds.sale_id
    AND users.id = auth.uid()
    AND users.role IN ('manager', 'owner', 'super_admin')
  )
);

CREATE POLICY "Managers can update refunds"
ON refunds FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    INNER JOIN users ON users.shop_id = sales.shop_id
    WHERE sales.id = refunds.sale_id
    AND users.id = auth.uid()
    AND users.role IN ('manager', 'owner', 'super_admin')
  )
);

-- Comments
COMMENT ON TABLE sales IS 'Point of sale transactions with payment details';
COMMENT ON TABLE sale_items IS 'Individual items in each sale';
COMMENT ON TABLE refunds IS 'Refund requests for sales';
COMMENT ON FUNCTION update_stock_after_sale() IS 'Automatically decreases inventory after sale';
COMMENT ON FUNCTION restore_stock_after_refund() IS 'Restores inventory when refund is approved';
