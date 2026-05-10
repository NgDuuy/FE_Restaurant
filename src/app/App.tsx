import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrderProvider } from './contexts/OrderContext';
import { KDSProvider } from './contexts/KdsContext';
import { MenuProvider } from './contexts/MenuContext';
import { Login } from './components/Login';
import { ServerDashboard } from './components/ServerDashboard';
import { ChefDashboard } from './components/ChefDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { Toaster } from './components/ui/sonner';
import React from "react";
function AppContent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  switch (user.role) {
    case 'server':
      return <ServerDashboard />;
    case 'chef':
      return <ChefDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    default:
      return <Login />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <MenuProvider>
        <OrderProvider>
          <KDSProvider>
            <AppContent />
            <Toaster />
          </KDSProvider>
        </OrderProvider>
      </MenuProvider>
    </AuthProvider>
  );
}
