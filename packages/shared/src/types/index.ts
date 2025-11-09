// Types partagés entre Admin et Client

export type UserRole = 
  | 'super_admin'      // Admin SONUTEC
  | 'owner'            // Propriétaire établissement
  | 'manager'          // Gérant de boutique
  | 'cashier'          // Caissier
  | 'warehouse'        // Magasinier
  | 'technician';      // Technicien SAV

export type SubscriptionStatus = 
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type PaymentMethod = 
  | 'cash'
  | 'mobile_money'
  | 'wave'
  | 'mixed';

export type PaymentStatus = 
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'refunded';

export type InvoiceFormat = 
  | 'a4'
  | 'thermal_80mm'
  | 'thermal_57mm';

export type RepairStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export type StockMovementType = 
  | 'entry'
  | 'exit'
  | 'transfer'
  | 'adjustment'
  | 'sale'
  | 'return';

export type InventoryStatus = 
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'validated';

// Interfaces principales

export interface Establishment {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  address?: string;
  logo_url?: string;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  tenant_id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  shop_id?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  model?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level?: number;
  has_imei: boolean;
  warranty_months?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  shop_id: string;
  user_id: string;
  invoice_number: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: PaymentMethod;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_name: string;
  price: number;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  auto_renew: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  validated_by?: string;
  validated_at?: string;
  created_at: string;
}

export interface Repair {
  id: string;
  tenant_id: string;
  shop_id: string;
  product_name: string;
  imei?: string;
  customer_name: string;
  customer_phone: string;
  problem_description: string;
  status: RepairStatus;
  technician_id?: string;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
  completed_at?: string;
}

// Constantes

export const SUBSCRIPTION_PRICE = 20000; // F CFA
export const GRACE_PERIOD_DAYS = 10;
export const LIMITED_SALES_PER_DAY = 10;

export const COLORS = {
  primary: '#5a2424',      // Marron
  secondary: '#f27120',    // Orange
  accent: '#fbd336',       // Jaune
  danger: '#f02726',       // Rouge
  background: '#ffffff',
  text: '#000000',
} as const;
