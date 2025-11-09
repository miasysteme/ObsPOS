import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Building2,
  Download,
  FileText,
  AlertCircle,
  Eye,
  Phone,
  Hash,
} from 'lucide-react';

interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  payment_phone: string;
  payment_proof_url: string | null;
  status: 'pending' | 'validated' | 'rejected';
  submitted_at: string;
  validated_at: string | null;
  validated_by: string | null;
  rejection_reason: string | null;
  receipt_url: string | null;
  notes: string | null;
  establishment?: {
    name: string;
    email: string;
    phone: string;
  };
  validator?: {
    full_name: string;
  };
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          establishment:establishments(name, email, phone),
          validator:users(full_name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.establishment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_phone?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    validated: payments.filter(p => p.status === 'validated').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    totalAmount: payments
      .filter(p => p.status === 'validated')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Paiements</h1>
        <p className="text-gray-600">Validez et suivez les paiements des établissements</p>
        
        {/* Wave Info Banner */}
        <div className="mt-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Compte Wave SONUTEC SARL</h3>
              <p className="text-sm text-gray-700 mb-2">
                Les établissements doivent envoyer leurs paiements à ce numéro :
              </p>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-orange-200 inline-flex">
                <Phone className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-lg text-orange-700">+225 0747537222</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="En attente"
          value={stats.pending}
          icon={Clock}
          color="yellow"
          badge={stats.pending > 0}
        />
        <StatCard
          title="Validés"
          value={stats.validated}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Rejetés"
          value={stats.rejected}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Montant Total"
          value={`${stats.totalAmount.toLocaleString()} FCFA`}
          icon={DollarSign}
          color="blue"
          isAmount
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par établissement, référence ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilterStatus('validated')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'validated'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Validés
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg transition ${
                filterStatus === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejetés
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Établissement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence Wave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Aucun paiement trouvé'
                      : 'Aucun paiement enregistré'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(payment.submitted_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(payment.submitted_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.establishment?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.establishment?.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {payment.amount.toLocaleString()} FCFA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Hash className="w-4 h-4" />
                        {payment.payment_reference}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {payment.payment_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded"
                          title="Voir les détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowValidateModal(true);
                              }}
                              className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded"
                              title="Valider"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                              title="Rejeter"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showDetailModal && selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {showValidateModal && selectedPayment && (
        <ValidatePaymentModal
          payment={selectedPayment}
          onClose={() => {
            setShowValidateModal(false);
            setSelectedPayment(null);
          }}
          onValidate={() => {
            loadPayments();
            setShowValidateModal(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {showRejectModal && selectedPayment && (
        <RejectPaymentModal
          payment={selectedPayment}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedPayment(null);
          }}
          onReject={() => {
            loadPayments();
            setShowRejectModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, badge, isAmount }: any) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {badge && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold text-gray-900 ${isAmount ? 'text-lg' : ''}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    validated: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const labels = {
    pending: 'En attente',
    validated: 'Validé',
    rejected: 'Rejeté',
  };

  const icons = {
    pending: Clock,
    validated: CheckCircle,
    rejected: XCircle,
  };

  const Icon = icons[status as keyof typeof icons];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      <Icon className="w-3 h-3" />
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function PaymentDetailModal({ payment, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Détails du Paiement</h2>
            <StatusBadge status={payment.status} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Établissement */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Établissement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nom :</span>
                <span className="font-medium">{payment.establishment?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email :</span>
                <span className="font-medium">{payment.establishment?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Téléphone :</span>
                <span className="font-medium">{payment.establishment?.phone}</span>
              </div>
            </div>
          </div>

          {/* Informations Paiement */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informations du Paiement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Montant :</span>
                <span className="font-bold text-lg">{payment.amount.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Méthode :</span>
                <span className="font-medium">Wave Money</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Référence :</span>
                <span className="font-medium font-mono">{payment.payment_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Téléphone émetteur :</span>
                <span className="font-medium">{payment.payment_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date de soumission :</span>
                <span className="font-medium">
                  {new Date(payment.submitted_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Preuve de Paiement */}
          {payment.payment_proof_url && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Preuve de Paiement Soumise
              </h3>
              <a
                href={payment.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Download className="w-4 h-4" />
                Télécharger la preuve
              </a>
            </div>
          )}

          {/* Validation Info */}
          {payment.status === 'validated' && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Validation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Validé par :</span>
                  <span className="font-medium">{payment.validator?.full_name || 'SONUTEC'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de validation :</span>
                  <span className="font-medium">
                    {new Date(payment.validated_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                {payment.receipt_url && (
                  <div className="mt-3">
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger l'accusé de réception
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Info */}
          {payment.status === 'rejected' && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Rejet
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Raison :</span>
                  <span className="font-medium text-red-700">{payment.rejection_reason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{payment.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidatePaymentModal({ payment, onClose, onValidate }: any) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleValidate() {
    try {
      setSaving(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          notes: notes || null,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Update establishment subscription (extend by 1 month)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      const { error: subError } = await supabase
        .from('establishments')
        .update({
          subscription_status: 'active',
          subscription_expires_at: subscriptionEndDate.toISOString(),
        })
        .eq('id', payment.tenant_id);

      if (subError) throw subError;

      onValidate();
    } catch (error: any) {
      console.error('Error validating payment:', error);
      setError(error.message || 'Erreur lors de la validation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Valider le Paiement
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Établissement :</strong> {payment.establishment?.name}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Montant :</strong> {payment.amount.toLocaleString()} FCFA
            </p>
            <p className="text-sm text-gray-700">
              <strong>Référence :</strong> {payment.payment_reference}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Ajoutez des notes sur cette validation..."
            />
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Action :</strong> L'abonnement de l'établissement sera prolongé d'1 mois
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Validation...' : 'Valider le Paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectPaymentModal({ payment, onClose, onReject }: any) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleReject() {
    if (!reason.trim()) {
      setError('Veuillez indiquer une raison de rejet');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          validated_by: user.id,
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      onReject();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      setError(error.message || 'Erreur lors du rejet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-600" />
            Rejeter le Paiement
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Établissement :</strong> {payment.establishment?.name}
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Montant :</strong> {payment.amount.toLocaleString()} FCFA
            </p>
            <p className="text-sm text-gray-700">
              <strong>Référence :</strong> {payment.payment_reference}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison du rejet *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
              placeholder="Indiquez pourquoi ce paiement est rejeté..."
              required
            />
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Attention :</strong> L'établissement sera notifié du rejet et devra soumettre un nouveau paiement
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleReject}
            disabled={saving || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? 'Rejet...' : 'Rejeter le Paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}
