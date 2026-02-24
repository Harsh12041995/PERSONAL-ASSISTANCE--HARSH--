// App.tsx — Harsh's Personal Command Center
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Toaster } from "react-hot-toast";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ErrorBoundary from "./components/ui/ErrorBoundary";

// ── Layout ──────────────────────────────────────────────────────────────────
import AppLayout from "./layout/AppLayout";

// ── Auth pages ───────────────────────────────────────────────────────────────
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import AdminSignIn from "./pages/AuthPages/AdminSignIn";
import PortalSignUp from "./pages/AuthPages/PortalSignUp";
import AuthRedirect from "./components/AuthRedirect";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import SetPasswordPage from "./components/auth/SetPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Personal module pages ─────────────────────────────────────────────────────
import Home from "./pages/Dashboard/Home";
import CapturePage from "./pages/CapturePage";
import PersonalTasksPage from "./pages/PersonalTasksPage";
import FinancePage from "./pages/FinancePage";
import KnowledgePage from "./pages/KnowledgePage";
import GoalsPage from "./pages/GoalsPage";
import HealthPage from "./pages/HealthPage";
import CareerPage from "./pages/CareerPage";
import SocialPage from "./pages/SocialPage";
import AiChatPage from "./pages/AiChatPage";
import Calendar from "./pages/Calendar";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import BlogsPage from "./pages/BlogsPage";
import WorkflowManagerPage from "./pages/WorkflowManagerPage";
import AIToolsHubPage from "./pages/AIToolsHubPage";
import UserManagement from "./pages/Admin/UserManagement";
import PermissionMatrix from "./pages/Admin/PermissionMatrix";
import NotFound from "./pages/OtherPage/NotFound";

// ── Scroll to top on route change ────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}


export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} />
      <Toaster position="bottom-right" />
      <ScrollToTopButton />

      <Routes>
        {/* ── Public auth routes ─────────────────────────────────────── */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin/login" element={<AdminSignIn />} />
        <Route path="/portal/signup" element={<PortalSignUp />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/auth-redirect" element={<AuthRedirect />} />

        {/* ── Personal app routes (protected) ────────────────────────── */}
        <Route element={<AppLayout />}>
          <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />

          <Route path="/capture" element={<ProtectedRoute><CapturePage /></ProtectedRoute>} />
          <Route path="/personal-tasks" element={<ProtectedRoute><PersonalTasksPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><KnowledgePage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
          <Route path="/career" element={<ProtectedRoute><CareerPage /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
          <Route path="/blogs" element={<ProtectedRoute><BlogsPage /></ProtectedRoute>} />
          <Route path="/workflow-manager" element={<ProtectedRoute><WorkflowManagerPage /></ProtectedRoute>} />
          <Route path="/ai-tools" element={<ProtectedRoute><AIToolsHubPage /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/permission-matrix" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><PermissionMatrix /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
