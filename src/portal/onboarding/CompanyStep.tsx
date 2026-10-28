import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { CompanyForm } from "../components/CompanyForm";

export default function CompanyStep(): ReactElement {
  usePageMeta({ title: "Your company — Zinwe", description: "Tell us about your company to set up Zinwe." });
  const { refresh } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="zau-card zau-company" aria-labelledby="onb-company-title">
      <div className="zau-head">
        <h1 className="zau-h1" id="onb-company-title">
          About your company
        </h1>
        <p className="zau-lede">
          This goes on your invoices and on each employee's Zinwe app. You can change it later in Settings.
        </p>
      </div>
      <CompanyForm
        mode="create"
        submitLabel="Continue to plan"
        employeeHint
        onSaved={async (company) => {
          await refresh({ company, onboarding: { step: "plan", has_company: true, subscription_status: null } });
          navigate("/onboarding/plan", { replace: true });
        }}
        onConflict={() => void refresh()}
      />
    </section>
  );
}
