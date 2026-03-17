import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

export default function PortalSignUpForm() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        department: "",
        purpose: ""
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await authService.registerUser({
                ...formData,
                username: formData.email.split('@')[0] + Math.floor(Math.random() * 1000)
            });
            setSuccess(true);
            setTimeout(() => navigate("/signin"), 5000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl text-center border border-emerald-100">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Request Sent!</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Your account has been created and is currently <strong>awaiting admin approval</strong>.
                        You will be able to log in once your access is granted.
                    </p>
                    <button
                        onClick={() => navigate("/signin")}
                        className="text-emerald-600 font-bold hover:underline"
                    >
                        Back to Login
                    </button>
                    <p className="text-xs text-gray-400 mt-10">Redirecting in 5 seconds...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Left side decoration */}
            <div className="hidden lg:flex lg:w-1/2 bg-violet-600 items-center justify-center p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500 rounded-full -mr-32 -mt-32 opacity-50" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-700 rounded-full -ml-48 -mb-48 opacity-30" />

                <div className="relative z-10 max-w-lg">
                    <h1 className="text-5xl font-extrabold mb-6 leading-tight">Join the new <br /><span className="text-emerald-400">Personal Portal.</span></h1>
                    <p className="text-xl text-violet-100 mb-10 leading-relaxed italic">
                        "Your space, your rules. Everything organized, exactly how you like it."
                    </p>
                    <div className="space-y-4">
                        {['Centralized Dashboard', 'Secure Access', 'Admin Managed'].map(item => (
                            <div key={item} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center text-violet-900">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="font-medium">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side form */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
                <div className="max-w-[460px] w-full bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                    <div className="mb-10 text-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-3 py-1 rounded-full mb-4 inline-block">New Portal Access</span>
                        <h2 className="text-3xl font-extrabold text-gray-900">Request Access</h2>
                        <p className="text-gray-500 mt-2">Fill in your details for admin review.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                required
                                placeholder="First Name"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                            />
                            <input
                                required
                                placeholder="Last Name"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                        <input
                            required
                            type="email"
                            placeholder="Work Email Address"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                            required
                            type="password"
                            placeholder="Create Password"
                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <div className="pt-2">
                            <input
                                required
                                placeholder="Department"
                                className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                            />
                        </div>
                        <textarea
                            required
                            placeholder="Purpose of access..."
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                            value={formData.purpose}
                            onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                        />

                        {error && <p className="text-red-500 text-xs font-medium px-2">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-black transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 mt-4"
                        >
                            {isLoading ? "Submitting Request..." : "Request Access →"}
                        </button>

                        <p className="text-center text-sm text-gray-500 mt-8">
                            Already have an account? <button type="button" onClick={() => navigate("/signin")} className="text-violet-600 font-bold hover:underline">Sign In</button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
