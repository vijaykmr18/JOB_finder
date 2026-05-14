import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function Shell() {
  const { authenticated, booting } = useAuth();

  if (booting) {
    return (
      <main className="center-screen">
        <div className="loader" />
      </main>
    );
  }

  return authenticated ? <DashboardPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
