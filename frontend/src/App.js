import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import InquiriesPage from "./pages/InquiriesPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import QuotationsPage from "./pages/QuotationsPage";
import InventoryPage from "./pages/InventoryPage";
import TicketsPage from "./pages/TicketsPage";
import GSTPage from "./pages/GSTPage";
import UsersPage from "./pages/UsersPage";
import HelpCenterPage from "./pages/HelpCenterPage";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002FA7]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002FA7]" />
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute roles={['admin','sales_team']}><CustomersPage /></ProtectedRoute>} />
      <Route path="/inquiries" element={<ProtectedRoute roles={['admin','sales_team']}><InquiriesPage /></ProtectedRoute>} />
      <Route path="/followups" element={<ProtectedRoute roles={['admin','sales_team']}><FollowUpsPage /></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute><QuotationsPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={['admin','sales_team']}><InventoryPage /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute roles={['admin','sales_team']}><TicketsPage /></ProtectedRoute>} />
      <Route path="/gst" element={<ProtectedRoute roles={['admin']}><GSTPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute roles={['customer']}><HelpCenterPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
