import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { CompanyForm } from "../components/CompanyForm";

export default function CompanyStep(): ReactElement {
  usePageMeta({ title: "Your company — Zinwe", description: "Tell us about your company to set up Zinwe." });
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.full_name.trim().split(/\s+/)[0];

  return (
    <section className="onb__card" aria-labelledby="onb-company-title">
      <div className="onb__head">
        <h1 className="onb__title" id="onb-company-title">
          {firstName ? `Welcome, ${firstName}. ` : ""}Tell us about your company
        </h1>
        <p className="onb__lede">This sets up your Zinwe account. You can change it later.</p>
      </div>
      <CompanyForm
        mode="create"
        submitLabel="Continue"
        onSaved={async (company) => {
          await refresh({ company, onboarding: { step: "plan", has_company: true, subscription_status: null } });
          navigate("/onboarding/plan", { replace: true });
        }}
        onConflict={() => void refresh()}
      />
    </section>
  );
}
