import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataHub from './pages/DataHub';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';

// Composant de protection dynamique
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('pegasus_token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes Protégées */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/datahub"
          element={
            <ProtectedRoute>
              <DataHub />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ia"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;