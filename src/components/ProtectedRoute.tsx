import { Navigate } from "react-router-dom";
import { JSX } from "react";
import { useAuth } from "../context/AuthContext";
import ForcePasswordChange from "./auth/ForcePasswordChange";

interface ProtectedRouteProps {
    children: JSX.Element;
    allowedRoles?: string[];
    requiredPermission?: string | string[];
}

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }: ProtectedRouteProps): JSX.Element => {
    const { token, role, user, isLoading, isInitialized, hasFeatureAccess } = useAuth();

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

    if (!token) {
        return <Navigate to="/signin" replace />;
    }

    // Admin-forced password change gates the whole app until resolved.
    if (user?.accountConfig?.mustChangePassword) {
        return <ForcePasswordChange />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role.toLowerCase())) {
        return <Navigate to="/" replace />;
    }

    if (requiredPermission) {
        const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const allowed = required.some((permissionId) => hasFeatureAccess(permissionId));
        if (!allowed) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
