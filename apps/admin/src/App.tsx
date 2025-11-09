import { useState, useEffect } from 'react';
import { supabase, isSuperAdmin } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          setCheckingAdmin(true);
          
          isSuperAdmin()
            .then(adminStatus => {
              setIsAdmin(adminStatus);
              setCheckingAdmin(false);
            })
            .catch(error => {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
              setCheckingAdmin(false);
            });
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (session) {
        setIsAuthenticated(true);
        setCheckingAdmin(true);
        
        // Vérifier le statut admin en arrière-plan sans bloquer
        isSuperAdmin()
          .then(adminStatus => {
            setIsAdmin(adminStatus);
            setCheckingAdmin(false);
          })
          .catch(error => {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
            setCheckingAdmin(false);
          });
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setCheckingAdmin(false);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setCheckingAdmin(false);
    } finally {
      // Toujours terminer le chargement même si la vérification admin est en cours
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => checkAuth()} />;
  }

  // Afficher un écran de chargement pendant la vérification du statut admin
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            <p className="font-medium">Accès refusé</p>
            <p className="text-sm mt-2">Vous n'avez pas les permissions nécessaires pour accéder à cette application d'administration.</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
