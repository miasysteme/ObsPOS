import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import Establishments from './Establishments';
import UsersPage from './Users';
import PaymentsPage from './Payments';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEstablishments: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Récupérer les statistiques globales
      const { data: establishments } = await supabase
        .from('establishments')
        .select('*');

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending');

      setStats({
        totalEstablishments: establishments?.length || 0,
        activeSubscriptions:
          establishments?.filter((e) => e.subscription_status === 'active')
            .length || 0,
        totalRevenue: 0, // À calculer selon les paiements validés
        pendingPayments: payments?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  PhonesPOS Admin
                </h1>
                <p className="text-sm text-gray-600">SONUTEC SARL</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Tableau de bord</span>
            </button>
            <button
              onClick={() => setActiveTab('establishments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'establishments'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="font-medium">Établissements</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'users'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Utilisateurs</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'payments'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Paiements</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'settings'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Paramètres</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Vue d'ensemble
              </h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Établissements</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? '...' : stats.totalEstablishments}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Abonnements actifs
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? '...' : stats.activeSubscriptions}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-secondary-100 p-3 rounded-lg">
                      <DollarSign className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Revenus totaux</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? '...' : `${stats.totalRevenue.toLocaleString()} F`}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-accent-100 p-3 rounded-lg">
                      <ShoppingBag className="w-6 h-6 text-accent-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Paiements en attente
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? '...' : stats.pendingPayments}
                  </p>
                </div>
              </div>

              {/* Table placeholder */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Activité récente
                </h3>
                <div className="text-center text-gray-500 py-12">
                  <p>Aucune activité récente</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'establishments' && <Establishments />}
          
          {activeTab === 'users' && <UsersPage />}
          
          {activeTab === 'payments' && <PaymentsPage />}

          {activeTab !== 'dashboard' && activeTab !== 'establishments' && activeTab !== 'users' && activeTab !== 'payments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {activeTab === 'settings' && 'Paramètres de la plateforme'}
              </h2>
              <div className="text-center text-gray-500 py-12">
                <p>Module en cours de développement</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
