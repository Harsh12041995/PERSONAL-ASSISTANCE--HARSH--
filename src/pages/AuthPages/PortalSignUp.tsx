import PortalSignUpForm from "../../components/auth/PortalSignUpForm";
import PageMeta from "../../shared/PageMeta";

export default function PortalSignUp() {
    return (
        <>
            <PageMeta
                title="Apply for Access - Personal Portal"
                description="Request access to the new command center portal."
            />
            <PortalSignUpForm />
        </>
    );
}
