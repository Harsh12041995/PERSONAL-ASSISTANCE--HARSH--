import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

export default function AdminSignInForm() {
    const navigate = useNavigate();
    const { login, user: authUser, token, isInitialized } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ email: "", password: "", form: "" });

    useEffect(() => {
        if (token && authUser && isInitialized) {
            const r = (typeof authUser.role === 'string' ? authUser.role : authUser.role?.name)?.toLowerCase();
            if (r === 'owner') {
                navigate("/admin/users");
            } else {
                navigate("/");
            }
        }
    }, [token, authUser, isInitialized, navigate]);

    const validate = () => {
        const errs = { email: "", password: "", form: "" };
        let ok = true;
        if (!email.trim()) {
            errs.email = "Email is required"; ok = false;
        }
        if (!password) {
            errs.password = "Password is required"; ok = false;
        }
        setErrors(errs);
        return ok;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        setErrors({ email: "", password: "", form: "" });

        try {
            const response = await authService.loginUser({ email: email.trim(), password });
            const { user: userData, token: accessToken, role, permissions } = response;

            const resolvedRole = (
                typeof userData.role === "string"
                    ? userData.role
                    : userData.role?.name || role?.name || "owner"
            )?.toLowerCase() || "user";

            if (resolvedRole !== 'owner') {
                setErrors(prev => ({ ...prev, form: "Access denied. You do not have administrative privileges." }));
                setIsLoading(false);
                return;
            }

            login(accessToken, null, resolvedRole, permissions, userData);
            navigate("/admin/users");
        } catch (error: any) {
            let msg = "Invalid admin credentials.";
            if (error?.response) {
                msg = error.response.data?.message || msg;
            }
            setErrors(prev => ({ ...prev, form: msg }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-[400px] bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shadow-xl mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
                    <p className="text-gray-400 text-sm mt-1">Authorized personnel only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Admin Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@personal.app"
                            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                            disabled={isLoading}
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>

                    {errors.form && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {errors.form}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                        {isLoading ? "Verifying..." : "Access Control Center"}
                    </button>
                </form>
            </div>
        </div>
    );
}
