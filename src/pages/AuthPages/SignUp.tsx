// SignUp.tsx
import SignUpFormNew from "../../components/auth/SignUpFormNew";
import PageMeta from "../../shared/PageMeta";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up - Sorigin Energy"
        description="Create your account to access renewable energy investments and sustainable portfolio management."
      />
      <SignUpFormNew />
    </>
  );
}
