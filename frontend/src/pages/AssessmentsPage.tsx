import { ListMagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adapter } from "../adapterClient";
import type { AssessmentModel } from "../adapter";
import { participantRole } from "../actions";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { isContractConfigured } from "../config";
import { phaseLabel, phaseTone } from "../labels";
import { useWallet } from "../wallet/WalletProvider";

type Filter = "all" | "action" | "finalized";

const filters: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All roles" },
  { key: "action", label: "Needs my action" },
  { key: "finalized", label: "Finalized" },
];

const ACTIONABLE_PHASES = ["AWAITING_RATIFICATION", "READY_FOR_REVIEW", "RETRYABLE"];

export function AssessmentsPage() {
  const { account, openModal } = useWallet();
  const [assessments, setAssessments] = useState<AssessmentModel[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!account || !isContractConfigured) {
      setAssessments([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ids = await adapter.listAssessmentIds();
      const records: AssessmentModel[] = [];
      for (const id of ids) {
        try {
          records.push(await adapter.getAssessment(id));
        } catch {
          // A single missing or unreadable assessment does not block the list.
        }
      }
      const mine = records.filter((record) => participantRole(account, record) !== "NONE");
      setAssessments(mine);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Canonical assessments could not be read.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = assessments.filter((record) => {
    if (filter === "finalized") return record.settled;
    if (filter === "action") return ACTIONABLE_PHASES.includes(record.phase);
    return true;
  });

  const description = !account
    ? "Connect a wallet to find assessments where your address is the sponsor, operator, or safety steward."
    : !isContractConfigured
      ? "A contract address has not been configured, so Tierline cannot read canonical assessments yet."
      : "Assessments involving the connected address, read from canonical contract state.";

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Assessments"
        description="Revisit funded profiles, pending approvals, neutral reviews, and finalized launch routes."
        action={<Link className="button primary" to="/assessments/new"><Plus aria-hidden="true" />New assessment</Link>}
      />
      <div className="filter-row" aria-label="Assessment filters">
        {filters.map((entry) => (
          <button
            key={entry.key}
            className={`filter-chip${filter === entry.key ? " active" : ""}`}
            type="button"
            disabled={!account || !isContractConfigured}
            aria-pressed={filter === entry.key}
            onClick={() => setFilter(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {!account && (
        <EmptyState
          icon={ListMagnifyingGlass}
          title="Connect to find your assessments"
          description={description}
          action={<button className="button secondary" onClick={openModal}>Choose a wallet</button>}
        />
      )}
      {account && !isContractConfigured && (
        <EmptyState icon={ListMagnifyingGlass} title="Canonical reads unavailable" description={description} />
      )}
      {account && isContractConfigured && loading && (
        <p className="field-intro" role="status">Reading canonical assessments…</p>
      )}
      {account && isContractConfigured && !loading && error && (
        <EmptyState icon={ListMagnifyingGlass} title="Canonical read failed" description={error} action={<button className="button secondary" onClick={() => void reload()}>Try again</button>} />
      )}
      {account && isContractConfigured && !loading && !error && visible.length === 0 && (
        <EmptyState
          icon={ListMagnifyingGlass}
          title={assessments.length === 0 ? "No canonical assessments to show" : "Nothing matches this filter"}
          description={assessments.length === 0 ? "No assessments involving this account were returned by the canonical contract view." : "Switch filters to see other assessments for this address."}
        />
      )}
      {account && isContractConfigured && !loading && !error && visible.length > 0 && (
        <div className="assessment-list">
          {visible.map((record) => (
            <Link key={record.assessmentId} className="assessment-card" to={`/assessments/${record.assessmentId}`}>
              <div>
                <span className={`status-pill ${phaseTone(record.phase)}`}>{phaseLabel(record.phase)}</span>
                <h3>{record.systemName}</h3>
                <p>{record.purpose}</p>
              </div>
              <div>
                <strong>{record.lockedGen !== "0" ? `${record.lockedGen} GEN locked` : `${record.creditedTotalGen} GEN routed`}</strong>
                <br />
                <span className="mono">{record.assessmentId}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
