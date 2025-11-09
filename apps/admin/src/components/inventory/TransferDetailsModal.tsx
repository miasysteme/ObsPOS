import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Package, CheckCircle, XCircle, Truck } from 'lucide-react';

interface TransferItem {
  id: string;
  product: { name: string; sku: string };
  quantity_requested: number;
  quantity_shipped: number | null;
  quantity_received: number | null;
}

interface Transfer {
  id: string;
  transfer_number: string;
  status: string;
  from_shop: { name: string };
  to_shop: { name: string };
  requested_at: string;
  approved_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  notes: string | null;
  items: TransferItem[];
}

interface TransferDetailsModalProps {
  transferId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TransferDetailsModal({ transferId, onClose, onUpdate }: TransferDetailsModalProps) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadTransfer();
  }, [transferId]);

  async function loadTransfer() {
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_shop:shops!stock_transfers_from_shop_id_fkey(name),
          to_shop:shops!stock_transfers_to_shop_id_fkey(name),
          items:stock_transfer_items(
            *,
            product:products(name, sku)
          )
        `)
        .eq('id', transferId)
        .single();

      if (error) throw error;
      setTransfer(data);
    } catch (error) {
      console.error('Error loading transfer:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!confirm('Approuver ce transfert ?')) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('stock_transfers')
        .update({
          status: 'APPROVED',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;
      
      alert('Transfert approuvé !');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleShip() {
    if (!confirm('Marquer comme expédié ?')) return;
    
    setProcessing(true);
    try {
      // Mettre toutes les quantités shipped = requested
      const updates = transfer?.items.map(item => ({
        id: item.id,
        quantity_shipped: item.quantity_requested,
      }));

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .upsert(updates);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('stock_transfers')
        .update({
          status: 'IN_TRANSIT',
          shipped_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;
      
      alert('Transfert expédié !');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleReceive() {
    if (!confirm('Confirmer la réception ?')) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mettre toutes les quantités received = shipped
      const updates = transfer?.items.map(item => ({
        id: item.id,
        quantity_received: item.quantity_shipped || item.quantity_requested,
      }));

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .upsert(updates);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('stock_transfers')
        .update({
          status: 'COMPLETED',
          received_by: user?.id,
          received_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;
      
      alert('Transfert complété ! Les stocks ont été ajustés automatiquement.');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Annuler ce transfert ? Cette action est irréversible.')) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'CANCELLED' })
        .eq('id', transferId);

      if (error) throw error;
      
      alert('Transfert annulé');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      IN_TRANSIT: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      IN_TRANSIT: 'En transit',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!transfer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{transfer.transfer_number}</h3>
              <div className="flex items-center gap-3 mt-1">
                {getStatusBadge(transfer.status)}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Infos Transfert */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-2">Boutique Source</div>
              <div className="text-lg font-semibold text-blue-700">{transfer.from_shop.name}</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-900 mb-2">Boutique Destination</div>
              <div className="text-lg font-semibold text-green-700">{transfer.to_shop.name}</div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">Chronologie</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span>Demandé le {new Date(transfer.requested_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
              {transfer.approved_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Approuvé le {new Date(transfer.approved_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}</span>
                </div>
              )}
              {transfer.shipped_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="w-4 h-4 text-purple-500" />
                  <span>Expédié le {new Date(transfer.shipped_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}</span>
                </div>
              )}
              {transfer.received_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Reçu le {new Date(transfer.received_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Produits */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Produits ({transfer.items.length})</h4>
            <div className="space-y-2">
              {transfer.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.product.name}</div>
                    <div className="text-sm text-gray-500">{item.product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {item.quantity_received !== null ? (
                        <span className="text-green-600">Reçu: {item.quantity_received}</span>
                      ) : item.quantity_shipped !== null ? (
                        <span className="text-purple-600">Expédié: {item.quantity_shipped}</span>
                      ) : (
                        <span>Demandé: {item.quantity_requested}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{transfer.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            {transfer.status === 'PENDING' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approuver
                </button>
              </>
            )}
            
            {transfer.status === 'APPROVED' && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleShip}
                  disabled={processing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Expédier
                </button>
              </>
            )}
            
            {transfer.status === 'IN_TRANSIT' && (
              <button
                onClick={handleReceive}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmer Réception
              </button>
            )}

            {(transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
