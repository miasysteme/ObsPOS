// Types générés automatiquement par Supabase CLI
// Commande: supabase gen types typescript --local > packages/database/src/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      establishments: {
        Row: {
          id: string
          name: string
          owner_name: string
          email: string
          phone: string
          address: string | null
          logo_url: string | null
          subscription_status: 'active' | 'expired' | 'suspended' | 'cancelled'
          subscription_expires_at: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_name: string
          email: string
          phone: string
          address?: string | null
          logo_url?: string | null
          subscription_status?: 'active' | 'expired' | 'suspended' | 'cancelled'
          subscription_expires_at?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_name?: string
          email?: string
          phone?: string
          address?: string | null
          logo_url?: string | null
          subscription_status?: 'active' | 'expired' | 'suspended' | 'cancelled'
          subscription_expires_at?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      shops: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address: string | null
          phone: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          address?: string | null
          phone?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          address?: string | null
          phone?: string | null
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string | null
          email: string
          full_name: string
          role: 'super_admin' | 'owner' | 'manager' | 'cashier' | 'warehouse' | 'technician'
          shop_id: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          email: string
          full_name: string
          role: 'super_admin' | 'owner' | 'manager' | 'cashier' | 'warehouse' | 'technician'
          shop_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          email?: string
          full_name?: string
          role?: 'super_admin' | 'owner' | 'manager' | 'cashier' | 'warehouse' | 'technician'
          shop_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          name: string
          sku: string | null
          barcode: string | null
          brand: string | null
          model: string | null
          description: string | null
          cost_price: number
          selling_price: number
          stock_quantity: number
          min_stock_level: number
          has_imei: boolean
          warranty_months: number
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          category_id?: string | null
          name: string
          sku?: string | null
          barcode?: string | null
          brand?: string | null
          model?: string | null
          description?: string | null
          cost_price?: number
          selling_price: number
          stock_quantity?: number
          min_stock_level?: number
          has_imei?: boolean
          warranty_months?: number
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          category_id?: string | null
          name?: string
          sku?: string | null
          barcode?: string | null
          brand?: string | null
          model?: string | null
          description?: string | null
          cost_price?: number
          selling_price?: number
          stock_quantity?: number
          min_stock_level?: number
          has_imei?: boolean
          warranty_months?: number
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          tenant_id: string
          shop_id: string
          user_id: string
          invoice_number: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_method: 'cash' | 'mobile_money' | 'wave' | 'mixed'
          payment_details: Json
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          shop_id: string
          user_id: string
          invoice_number?: string
          subtotal: number
          tax_amount?: number
          discount_amount?: number
          total_amount: number
          payment_method: 'cash' | 'mobile_money' | 'wave' | 'mixed'
          payment_details?: Json
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          shop_id?: string
          user_id?: string
          invoice_number?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_method?: 'cash' | 'mobile_money' | 'wave' | 'mixed'
          payment_details?: Json
          customer_name?: string | null
          customer_phone?: string | null
          customer_email?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          tenant_id: string
          establishment_name: string
          total_shops: number
          total_users: number
          total_products: number
          total_stock: number
          sales_today: number
          revenue_today: number
          sales_this_month: number
          revenue_this_month: number
          subscription_status: string
          subscription_expires_at: string | null
        }
      }
    }
    Functions: {
      get_user_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
