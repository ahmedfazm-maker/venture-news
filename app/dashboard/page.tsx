"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus =
  | "started"
  | "signals_ready"
  | "draft_generating"
  | "awaiting_review"
  | "approved"
  | "sent"
  | "failed";

interface Signal {
  title: string;
  source: string;
  score: number;
}

interface Job {
  status: JobStatus;
  week: string;
  started_at: string;
  review_token?: string;
  error?: string;
  signals?: Signal[];
  draft?: {
    subject_line: string;
  };
}

interface Edition {
  week: string;
  subject_line: string;
  sent_at: string;
  post_id?: string;
}

interface DashboardData {
  valid: boolean;
  job: Job | null;
  editions: Edition[];
}

// ─── Brand colors ─────────────────────────────────────────────────────────────

const C = {
  teal:   "#02686F",
  accent: "#29BE9C",
  mint:   "#DCF1DD",
  black:  "#070C0C",
  white:  "#ffffff",
  gray:   "#888888",
  lightBg:"#F4FAF9",
  border: "#D4EDE8",
};

const SANS = "-apple-system, 'Helvetica Neue', Arial, sans-serif";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<JobStatus, string> = {
  started:          "Starting…",
  signals_ready:    "Signals ready",
  draft_generating: "Generating draft…",
  awaiting_review:  "Awaiting review",
  approved:         "Approved",
  sent:             "Sent",
  failed:           "Failed",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  started:          "#F59E0B",
  signals_ready:    "#F59E0B",
  draft_generating: "#F59E0B",
  awaiting_review:  C.accent,
  approved:         C.accent,
  sent:             C.teal,
  failed:           "#EF4444",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [secret, setSecret]       = useState<string | null>(null);
  const [data, setData]           = useState<DashboardData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [runMsg, setRunMsg]       = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (s: string) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/data?secret=${encodeURIComponent(s)}`);
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch {
      setData({ valid: false, job: null, editions: [] });
    }
    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("DASHBOARD_SECRET");
    setSecret(s);
    if (s) {
      void fetchData(s);
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  async function runPipeline() {
    if (!secret) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch("/api/pipeline/trigger", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json() as { ok?: boolean; error?: string; week?: string };
      if (res.ok) {
        setRunMsg(`Pipeline started for ${json.week ?? "this week"}.`);
        setTimeout(() => void fetchData(secret), 3000);
      } else {
        setRunMsg(`Error: ${json.error ?? "Unknown error"}`);
      }
    } catch {
      setRunMsg("Network error — check server logs.");
    }
    setRunning(false);
  }

  // ── Loading / access denied ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SANS, color: C.gray }}>Loading…</p>
      </div>
    );
  }

  if (!secret || !data?.valid) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={styles.deniedBox}>
          <p style={{ margin: "0 0 6px", fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.accent }}>
            Venture News
          </p>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 16, color: C.black }}>Access denied.</p>
          <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12, color: C.gray }}>
            Add ?DASHBOARD_SECRET=... to the URL.
          </p>
        </div>
      </div>
    );
  }

  const { job, editions } = data;
  const reviewUrl = job?.review_token
    ? `/review?token=${job.review_token}`
    : null;

  // ── Dashboard ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <p style={styles.wordmark}>Venture News</p>
          <p style={styles.headerSub}>Founder Dashboard</p>
        </div>
        <button
          onClick={() => secret && void fetchData(secret)}
          disabled={refreshing}
          style={styles.refreshBtn}
        >
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      <div style={styles.body}>

        {/* ── Pipeline Status ─────────────────────────────────────────────── */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Pipeline Status</h2>

          {!job ? (
            <div style={styles.statusRow}>
              <span style={{ ...styles.dot, backgroundColor: C.border }} />
              <span style={{ ...styles.statusLabel, color: C.gray }}>Idle — no pipeline run this week</span>
            </div>
          ) : (
            <>
              <div style={styles.statusRow}>
                <span style={{ ...styles.dot, backgroundColor: STATUS_COLORS[job.status] }} />
                <span style={styles.statusLabel}>{STATUS_LABELS[job.status]}</span>
              </div>
              <div style={styles.metaGrid}>
                <MetaItem label="Week" value={job.week} />
                <MetaItem label="Started" value={fmtDate(job.started_at)} />
                {job.error && <MetaItem label="Error" value={job.error} color="#EF4444" />}
              </div>
            </>
          )}
        </section>

        {/* ── Run Pipeline ────────────────────────────────────────────────── */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Run Pipeline</h2>
          <p style={styles.helpText}>
            Fetches signals, generates a draft, and emails you a review link.
          </p>
          <button
            onClick={() => void runPipeline()}
            disabled={running}
            style={{ ...styles.runBtn, opacity: running ? 0.7 : 1 }}
          >
            {running ? (
              <span>
                <Spinner /> Running…
              </span>
            ) : (
              "▶ Run This Week's Pipeline"
            )}
          </button>
          {runMsg && (
            <p style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 13, color: runMsg.startsWith("Error") ? "#EF4444" : C.teal }}>
              {runMsg}
            </p>
          )}
        </section>

        {/* ── Current Draft ────────────────────────────────────────────────── */}
        {job && ["awaiting_review", "approved"].includes(job.status) && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Current Draft</h2>

            {job.draft?.subject_line && (
              <p style={styles.subjectLine}>{job.draft.subject_line}</p>
            )}

            {reviewUrl && (
              <a href={reviewUrl} style={styles.reviewBtn}>
                Go to Review →
              </a>
            )}

            {job.signals && job.signals.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={styles.subSectionLabel}>Signals used</p>
                <div>
                  {job.signals.map((signal, i) => (
                    <div key={i} style={styles.signalItem}>
                      <span style={styles.signalScore}>
                        {(signal.score * 100).toFixed(0)}
                      </span>
                      <span style={styles.signalTitle}>{signal.title}</span>
                      <span style={styles.signalSource}>{signal.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Past Editions ────────────────────────────────────────────────── */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Past Editions</h2>
          {editions.length === 0 ? (
            <p style={{ fontFamily: SANS, fontSize: 14, color: C.gray, margin: 0 }}>
              No sent editions yet.
            </p>
          ) : (
            <div>
              {editions.map((ed, i) => (
                <div key={i} style={{ ...styles.editionRow, borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={styles.editionSubject}>{ed.subject_line}</p>
                    <p style={styles.editionMeta}>{ed.week} &middot; sent {fmtDate(ed.sent_at)}</p>
                  </div>
                  {ed.post_id && (
                    <a
                      href={`https://buttondown.com/emails/${ed.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.editionLink}
                    >
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function MetaItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.gray }}>
        {label}&nbsp;
      </span>
      <span style={{ fontFamily: SANS, fontSize: 13, color: color ?? C.black }}>
        {value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: 12, height: 12,
      border: `2px solid rgba(255,255,255,0.4)`,
      borderTopColor: C.white,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      marginRight: 8,
      verticalAlign: "middle",
    }} />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: C.lightBg,
    fontFamily: SANS,
  },
  header: {
    backgroundColor: C.teal,
    padding: "20px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerInner: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  wordmark: {
    margin: 0,
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: C.white,
  },
  headerSub: {
    margin: 0,
    fontFamily: SANS,
    fontSize: 13,
    color: C.accent,
    fontWeight: 500,
  },
  refreshBtn: {
    background: "transparent",
    border: `1px solid rgba(41,190,156,0.4)`,
    borderRadius: 4,
    color: C.accent,
    fontFamily: SANS,
    fontSize: 12,
    padding: "6px 14px",
    cursor: "pointer",
  },
  body: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "32px 20px 64px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "24px 28px",
  },
  cardTitle: {
    margin: "0 0 16px",
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.teal,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusLabel: {
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: 600,
    color: C.black,
  },
  metaGrid: {
    paddingLeft: 20,
    borderLeft: `2px solid ${C.mint}`,
  },
  helpText: {
    margin: "0 0 16px",
    fontFamily: SANS,
    fontSize: 13,
    color: C.gray,
    lineHeight: 1.5,
  },
  runBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.teal,
    color: C.white,
    border: "none",
    borderRadius: 5,
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 28px",
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  subjectLine: {
    margin: "0 0 16px",
    fontFamily: "'Georgia', serif",
    fontSize: 17,
    fontWeight: 500,
    color: C.black,
    lineHeight: 1.4,
  },
  reviewBtn: {
    display: "inline-block",
    backgroundColor: C.accent,
    color: C.white,
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 22px",
    borderRadius: 5,
    textDecoration: "none",
    letterSpacing: "0.02em",
  },
  subSectionLabel: {
    margin: "0 0 10px",
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.gray,
  },
  signalItem: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    padding: "8px 0",
    borderBottom: `1px solid ${C.border}`,
  },
  signalScore: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: 700,
    color: C.accent,
    minWidth: 28,
    flexShrink: 0,
  },
  signalTitle: {
    fontFamily: SANS,
    fontSize: 13,
    color: C.black,
    flex: 1,
    lineHeight: 1.4,
  },
  signalSource: {
    fontFamily: SANS,
    fontSize: 11,
    color: C.gray,
    flexShrink: 0,
  },
  editionRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 0",
  },
  editionSubject: {
    margin: "0 0 4px",
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: 500,
    color: C.black,
  },
  editionMeta: {
    margin: 0,
    fontFamily: SANS,
    fontSize: 12,
    color: C.gray,
  },
  editionLink: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.teal,
    textDecoration: "none",
    fontWeight: 600,
    flexShrink: 0,
  },
  deniedBox: {
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "40px 48px",
    textAlign: "center",
  },
};
