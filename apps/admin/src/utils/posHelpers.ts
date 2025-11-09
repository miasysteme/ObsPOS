// Utilitaires pour le POS

export interface ReceiptData {
  ticketNumber: string;
  date: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  customerName?: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
}

export async function loadDailySalesStats(supabase: any, shopId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('sales')
    .select('total_amount, sale_items(quantity)')
    .eq('shop_id', shopId)
    .gte('created_at', today.toISOString());

  const revenue = data?.reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
  const items = data?.reduce((sum: number, s: any) => {
    const count = s.sale_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
    return sum + count;
  }, 0) || 0;

  return {
    sales: data?.length || 0,
    revenue,
    items,
  };
}

export function prepareReceiptData(
  sale: any,
  items: any[],
  shopInfo: any,
  customerName?: string
): ReceiptData {
  return {
    ticketNumber: sale.ticket_number || `#${sale.id.slice(0, 8)}`,
    date: sale.created_at,
    shopName: shopInfo.name,
    shopAddress: shopInfo.address,
    shopPhone: shopInfo.phone,
    customerName,
    items: items.map(item => ({
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    })),
    subtotal: sale.subtotal_before_discount || sale.total_amount,
    discount: sale.discount_amount || 0,
    total: sale.total_amount,
    paymentMethod: sale.payment_method,
    amountReceived: sale.amount_received,
    change: sale.change_amount,
  };
}
