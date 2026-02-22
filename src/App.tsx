// App.tsx — Harsh's Personal Command Center
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { JSX, useEffect } from "react";
import { useAuth } from "./context/AuthContext";

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
import AuthRedirect from "./components/AuthRedirect";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
import SetPasswordPage from "./components/auth/SetPasswordPage";

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
import NotFound from "./pages/OtherPage/NotFound";

// ── Scroll to top on route change ────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ── Route guard ───────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }: { children: JSX.Element }): JSX.Element => {
  const { token, isLoading, isInitialized } = useAuth();
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-200">
            H
          </div>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500" />
        </div>
      </div>
    );
  }
  return token ? children : <Navigate to="/signin" replace />;
};

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
          <Route path="/ai-chat" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
