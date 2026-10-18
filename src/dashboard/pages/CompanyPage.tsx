import { useCallback, type ReactElement } from "react";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getCompany } from "../../lib/api";
import { CompanyForm } from "../../portal/components/CompanyForm";
import { ErrorState, LoadingState } from "../components/States";
import { useResource } from "../useResource";

export default function CompanyPage(): ReactElement {
  usePageMeta({ title: "Company info — Profile", description: "Your company details." });
  const { account, refresh } = useAuth();
  const load = useCallback((signal: AbortSignal) => getCompany(signal), []);
  const company = useResource(load);

  return (
    <>
      <section className="dash-card" aria-labelledby="co-title">
        <div className="dash-card__head">
          <h2 className="dash-card__title" id="co-title">
            Company details
          </h2>
        </div>
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
            loginEmail={account?.user.email}
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
