import { X, Printer, Download } from 'lucide-react';

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ReceiptModalProps {
  ticketNumber: string;
  date: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  onClose: () => void;
}

export default function ReceiptModal({
  ticketNumber,
  date,
  shopName,
  shopAddress,
  shopPhone,
  customerName,
  items,
  subtotal,
  discount,
  total,
  paymentMethod,
  amountReceived,
  change,
  onClose,
}: ReceiptModalProps) {
  
  const paymentLabels: Record<string, string> = {
    cash: 'Espèces 💵',
    mobile_money: 'Mobile Money 📱',
    card: 'Carte Bancaire 💳',
    credit: 'À Crédit 💰',
  };

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    // TODO: Implémenter génération PDF
    alert('Téléchargement PDF à implémenter avec jsPDF');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-xl font-bold text-gray-900">Reçu de Vente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu du reçu */}
        <div id="receipt-content" className="p-6 font-mono text-sm">
          {/* En-tête */}
          <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
            <h1 className="text-2xl font-bold mb-2">{shopName}</h1>
            {shopAddress && <p className="text-gray-600">{shopAddress}</p>}
            {shopPhone && <p className="text-gray-600">Tél: {shopPhone}</p>}
          </div>

          {/* Infos ticket */}
          <div className="mb-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket:</span>
              <span className="font-semibold">{ticketNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span>{new Date(date).toLocaleString('fr-FR')}</span>
            </div>
            {customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Client:</span>
                <span>{customerName}</span>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

          {/* Articles */}
          <div className="mb-4 space-y-3">
            {items.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between font-semibold">
                  <span>{item.product_name}</span>
                  <span>x{item.quantity}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>{item.unit_price.toLocaleString()} FCFA/u</span>
                  <span>{item.subtotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

          {/* Totaux */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Sous-total:</span>
              <span>{subtotal.toLocaleString()} FCFA</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Remise:</span>
                <span>-{discount.toLocaleString()} FCFA</span>
              </div>
            )}

            <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-xl font-bold">
              <span>TOTAL:</span>
              <span>{total.toLocaleString()} FCFA</span>
            </div>

            <div className="flex justify-between text-gray-600 mt-4">
              <span>Paiement:</span>
              <span>{paymentLabels[paymentMethod] || paymentMethod}</span>
            </div>

            {amountReceived && paymentMethod === 'cash' && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Montant reçu:</span>
                  <span>{amountReceived.toLocaleString()} FCFA</span>
                </div>
                {change && change > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Rendu:</span>
                    <span>{change.toLocaleString()} FCFA</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

          {/* Pied de page */}
          <div className="text-center text-gray-600 space-y-2">
            <p className="font-semibold text-lg">Merci de votre visite !</p>
            <p className="text-xs">www.obs-systeme.store</p>
            <p className="text-xs mt-4">Ce reçu fait office de facture</p>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Télécharger PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimer
          </button>
        </div>
      </div>

      {/* CSS pour l'impression */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
