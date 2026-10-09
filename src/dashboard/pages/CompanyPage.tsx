import { useCallback, type ReactElement } from "react";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getCompany } from "../../lib/api";
import { CompanyForm } from "../../portal/components/CompanyForm";
import { ErrorState, LoadingState, PageHeader } from "../components/States";
import { useResource } from "../useResource";

export default function CompanyPage(): ReactElement {
  usePageMeta({ title: "Company — Zinwe", description: "Your company details." });
  const { refresh } = useAuth();
  const load = useCallback((signal: AbortSignal) => getCompany(signal), []);
  const company = useResource(load);

  return (
    <>
      <PageHeader title="Company" lede="The business details on your Zinwe account." />
      <section className="dash-card" aria-label="Company details">
        {company.data === undefined ? (
          company.error ? (
            <ErrorState
              title="We couldn't load your company"
              message={errorMessage(company.error)}
              onRetry={company.reload}
              retrying={company.pending}
            />
          ) : (
            <LoadingState label="Loading your company…" rows={4} />
          )
        ) : (
          <CompanyForm
            mode="edit"
            initial={company.data}
            submitLabel="Save changes"
            onSaved={async (saved) => {
              company.setData(saved);
              await refresh({ company: saved });
            }}
          />
        )}
      </section>
    </>
  );
}
