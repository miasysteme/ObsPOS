import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, User, Phone, CreditCard, Plus } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  customer_type: string;
  credit_limit: number;
  current_balance: number;
}

interface CustomerSelectModalProps {
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export default function CustomerSelectModal({ onClose, onSelect, selectedCustomer }: CustomerSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchCustomers();
  }, [searchTerm]);

  async function searchCustomers() {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(customer: Customer) {
    onSelect(customer);
    onClose();
  }

  function handleAnonymous() {
    onSelect(null);
    onClose();
  }

  function getCreditDisplay(customer: Customer) {
    const available = customer.credit_limit - customer.current_balance;
    const percentage = (customer.current_balance / customer.credit_limit) * 100;
    
    return {
      available,
      percentage,
      color: percentage > 90 ? 'text-red-600' : percentage > 70 ? 'text-orange-600' : 'text-green-600',
      bgColor: percentage > 90 ? 'bg-red-50' : percentage > 70 ? 'bg-orange-50' : 'bg-green-50',
    };
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-gray-900">Sélectionner un Client</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Recherche */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, téléphone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Client actuel sélectionné */}
          {selectedCustomer && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900">Client actuel</p>
                  <p className="text-blue-700">{selectedCustomer.name}</p>
                </div>
                <button
                  onClick={handleAnonymous}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Retirer
                </button>
              </div>
            </div>
          )}

          {/* Liste des clients */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => {
                const creditInfo = getCreditDisplay(customer);
                
                return (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="text-gray-400">{customer.email}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {customer.customer_type === 'WHOLESALE' ? 'Grossiste' :
                         customer.customer_type === 'SEMI_WHOLESALE' ? 'Demi-Grossiste' : 'Particulier'}
                      </span>
                    </div>

                    {/* Crédit info */}
                    <div className={`mt-2 p-2 ${creditInfo.bgColor} rounded`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-700">
                          <CreditCard className="w-3 h-3" />
                          Crédit disponible
                        </span>
                        <span className={`font-semibold ${creditInfo.color}`}>
                          {creditInfo.available.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1 text-gray-600">
                        <span>Utilisé: {customer.current_balance.toLocaleString()} FCFA</span>
                        <span>Limite: {customer.credit_limit.toLocaleString()} FCFA</span>
                      </div>
                      {/* Barre de progression */}
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${creditInfo.percentage > 90 ? 'bg-red-600' : creditInfo.percentage > 70 ? 'bg-orange-600' : 'bg-green-600'}`}
                          style={{ width: `${Math.min(creditInfo.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={handleAnonymous}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <User className="w-5 h-5" />
            Client Anonyme
          </button>
          <button
            onClick={() => {
              // TODO: Ouvrir modal création client
              alert('Fonctionnalité "Nouveau Client" à venir');
            }}
            className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouveau Client
          </button>
        </div>
      </div>
    </div>
  );
}
