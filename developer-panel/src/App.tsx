import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AuthGuard } from './routes/AuthGuard';
import { Login } from './features/auth/Login';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './features/dashboard/Dashboard';
import { FeatureList } from './features/subscription-features/FeatureList';
import { PlanList } from './features/subscription-plans/PlanList';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plans/*" element={<PlanList />} />
            <Route path="/features/*" element={<FeatureList />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
