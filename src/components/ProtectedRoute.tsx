import { Navigate } from "react-router-dom";
import { JSX } from "react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
    children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): JSX.Element => {
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

export default ProtectedRoute;
