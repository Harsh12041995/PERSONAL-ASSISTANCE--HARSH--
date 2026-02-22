// signin.tsx
import SignInFormNew from "../../components/auth/SignInFormNew";
import PageMeta from "../../shared/PageMeta";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Harsh's Space — Sign In"
        description="Your personal command center. Tasks, habits, finance, goals — all in one place."
      />
      <SignInFormNew />
    </>
  );
}