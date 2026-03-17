import AdminSignInForm from "../../components/auth/AdminSignInForm";
import PageMeta from "../../shared/PageMeta";

export default function AdminSignIn() {
    return (
        <>
            <PageMeta
                title="Admin Access - Command Center"
                description="Secure portal for administrative access."
            />
            <AdminSignInForm />
        </>
    );
}
