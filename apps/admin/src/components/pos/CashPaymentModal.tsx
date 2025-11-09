import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface CashPaymentModalProps {
  totalAmount: number;
  onClose: () => void;
  onConfirm: (amountReceived: number) => void;
}

export default function CashPaymentModal({ totalAmount, onClose, onConfirm }: CashPaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState<string>(totalAmount.toString());
  
  const receivedNum = parseFloat(amountReceived) || 0;
  const change = receivedNum - totalAmount;
  const isValid = receivedNum >= totalAmount;

  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 1000) * 1000, // Arrondi au millier supérieur
    Math.ceil(totalAmount / 5000) * 5000, // Arrondi à 5000 supérieur
    Math.ceil(totalAmount / 10000) * 10000, // Arrondi à 10000 supérieur
  ].filter((amount, index, self) => self.indexOf(amount) === index); // Retirer doublons

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Paiement Espèces
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Total à payer */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total à payer</p>
          <p className="text-3xl font-bold text-primary">
            {totalAmount.toLocaleString()} FCFA
          </p>
        </div>

        {/* Montant reçu */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant reçu
          </label>
          <input
            type="number"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            className="w-full px-4 py-3 text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
            placeholder="Saisir le montant"
            min={totalAmount}
            step="1000"
            autoFocus
          />
        </div>

        {/* Raccourcis montants */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2">💡 Raccourcis rapides :</p>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setAmountReceived(amount.toString())}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                {(amount / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Rendu monnaie */}
        {isValid && change > 0 && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm text-green-700 mb-1">Rendu à remettre</p>
            <p className="text-3xl font-bold text-green-600">
              {change.toLocaleString()} FCFA
            </p>
          </div>
        )}

        {/* Message erreur */}
        {!isValid && receivedNum > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              ⚠️ Le montant reçu est insuffisant
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(receivedNum)}
            disabled={!isValid}
            className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Valider Vente
          </button>
        </div>
      </div>
    </div>
  );
}
