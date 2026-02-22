// components/AuthRedirect.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthRedirect() {
  const { token, role, isLoading, isInitialized } = useAuth();

  // Show loading state while auth is initializing
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  // Handle role names case-insensitively
  const roleLower = role?.toLowerCase();

  if (roleLower === "asset engineer") return <Navigate to="/portal" replace />;
  if (roleLower === "admin") return <Navigate to="/dashboard" replace />;
  if (roleLower === "ho") return <Navigate to="/dashboard/ho" replace />;
  if (roleLower === "manager")
    return <Navigate to="/dashboard/manager" replace />;

  // fallback
  return <Navigate to="/dashboard" replace />;
}
