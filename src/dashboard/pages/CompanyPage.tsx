import { useCallback, type ReactElement } from "react";
import { useAuth } from "../../auth/authContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import { errorMessage, getCompany } from "../../lib/api";
import { CompanyCard } from "../settings/CompanyCard";
import { ErrorBlock, Sk } from "../ui/States";
import { useResource } from "../useResource";

/** Settings → Company (board DashSettings #tab=company). */
export default function CompanyPage(): ReactElement {
  usePageMeta({ title: "Company — Settings", description: "Your company details." });
  const { account, refresh } = useAuth();
  const load = useCallback((signal: AbortSignal) => getCompany(signal), []);
  const company = useResource(load);

  if (company.data === undefined) {
    return company.error ? (
      <section className="z-card zp-card">
        <ErrorBlock title="We couldn't load your company" message={errorMessage(company.error)} onRetry={company.reload} />
      </section>
    ) : (
      <section className="z-card zp-card" aria-busy="true">
        <span className="z-sr" role="status">
          Loading your company…
        </span>
        <div className="zp-cogrid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="zp-f">
              <Sk w="40%" h={12} />
              <Sk h={44} style={{ borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <CompanyCard
      company={company.data}
      loginEmail={account?.user.email ?? ""}
      onSaved={async (saved) => {
        company.setData(saved);
        await refresh({ company: saved });
      }}
    />
  );
}
