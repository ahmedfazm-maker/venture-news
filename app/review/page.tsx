"use client";

import { useState, useEffect } from "react";
import type { Job } from "@/lib/kv";

type Draft = NonNullable<Job["draft"]>;

interface ReviewPageState {
  loading: boolean;
  error: string | null;
  draft: Draft | null;
  token: string | null;
  submitting: boolean;
  submitted: boolean;
  submitMessage: string;
}

export default function ReviewPage() {
  const [state, setState] = useState<ReviewPageState>({
    loading: true,
    error: null,
    draft: null,
    token: null,
    submitting: false,
    submitted: false,
    submitMessage: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setState((s) => ({ ...s, loading: false, error: "No review token provided." }));
      return;
    }

    fetch(`/api/review/draft?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? "Failed to load draft");
        }
        return res.json() as Promise<Draft>;
      })
      .then((draft) => {
        setState((s) => ({ ...s, loading: false, draft, token }));
      })
      .catch((err: Error) => {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
  }, []);

  function updateSection(index: number, content: string) {
    setState((s) => {
      if (!s.draft) return s;
      const sections = [...s.draft.sections];
      sections[index] = { ...sections[index], content };
      return { ...s, draft: { ...s.draft, sections } };
    });
  }

  function updateSubjectLine(value: string) {
    setState((s) => {
      if (!s.draft) return s;
      return { ...s, draft: { ...s.draft, subject_line: value } };
    });
  }

  function updatePreviewText(value: string) {
    setState((s) => {
      if (!s.draft) return s;
      return { ...s, draft: { ...s.draft, preview_text: value } };
    });
  }

  async function submit(action: "approve" | "reject") {
    if (!state.token || !state.draft) return;

    setState((s) => ({ ...s, submitting: true }));

    try {
      const res = await fetch("/api/pipeline/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: state.token,
          action: action === "approve" ? "edit" : "reject",
          draft: action === "approve" ? state.draft : undefined,
        }),
      });

      const data = await res.json() as { ok?: boolean; error?: string; message?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setState((s) => ({
        ...s,
        submitting: false,
        submitted: true,
        submitMessage:
          action === "approve"
            ? "Draft approved and sent to Beehiiv. Check your email for confirmation."
            : "Draft rejected. A new draft is being generated — check your email shortly.",
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, submitting: false, error: message }));
    }
  }

  if (state.loading) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>Loading draft…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={styles.center}>
        <p style={styles.errorText}>{state.error}</p>
      </div>
    );
  }

  if (state.submitted) {
    return (
      <div style={styles.center}>
        <div style={styles.successBox}>
          <p style={styles.successText}>{state.submitMessage}</p>
        </div>
      </div>
    );
  }

  const { draft } = state;
  if (!draft) return null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <p style={styles.label}>Venture News — Draft Review</p>
          <h1 style={styles.title}>Review this week&apos;s newsletter</h1>
          <p style={styles.subtitle}>
            Edit any section below, then approve to send to Beehiiv or reject to regenerate.
          </p>
        </header>

        <section style={styles.metaSection}>
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Subject Line</label>
            <input
              style={styles.input}
              value={draft.subject_line}
              onChange={(e) => updateSubjectLine(e.target.value)}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Preview Text</label>
            <input
              style={styles.input}
              value={draft.preview_text}
              onChange={(e) => updatePreviewText(e.target.value)}
            />
          </div>
        </section>

        {draft.sections.map((section, index) => (
          <div key={section.id} style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>{section.name}</h2>
            <textarea
              style={styles.textarea}
              value={section.content}
              rows={8}
              onChange={(e) => updateSection(index, e.target.value)}
            />
          </div>
        ))}

        <div style={styles.actions}>
          <button
            style={styles.rejectButton}
            onClick={() => submit("reject")}
            disabled={state.submitting}
          >
            {state.submitting ? "Working…" : "Reject & Regenerate"}
          </button>
          <button
            style={styles.approveButton}
            onClick={() => submit("approve")}
            disabled={state.submitting}
          >
            {state.submitting ? "Working…" : "Approve & Send to Beehiiv"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f0",
    padding: "40px 20px",
    fontFamily: "Georgia, serif",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
  },
  header: {
    marginBottom: 40,
    borderBottom: "3px solid #111",
    paddingBottom: 24,
  },
  label: {
    margin: "0 0 8px",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#888",
  },
  title: {
    margin: "0 0 8px",
    fontSize: 28,
    fontWeight: "bold",
    color: "#111",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "#666",
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  metaSection: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0d8",
    borderRadius: 4,
    padding: "24px",
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    display: "block",
    marginBottom: 6,
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#888",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 15,
    fontFamily: "Georgia, serif",
    border: "1px solid #ddd",
    borderRadius: 4,
    outline: "none",
    boxSizing: "border-box",
  },
  sectionCard: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0d8",
    borderRadius: 4,
    padding: "24px",
    marginBottom: 16,
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    fontFamily: "'Helvetica Neue', sans-serif",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "2px solid #111",
    paddingBottom: 8,
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "Georgia, serif",
    lineHeight: 1.7,
    border: "1px solid #ddd",
    borderRadius: 4,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    color: "#333",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #ddd",
  },
  rejectButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontFamily: "'Helvetica Neue', sans-serif",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#111",
    border: "2px solid #111",
    borderRadius: 4,
    cursor: "pointer",
  },
  approveButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontFamily: "'Helvetica Neue', sans-serif",
    fontWeight: "bold",
    backgroundColor: "#111",
    color: "#fff",
    border: "2px solid #111",
    borderRadius: 4,
    cursor: "pointer",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, serif",
  },
  muted: {
    color: "#888",
    fontSize: 16,
  },
  errorText: {
    color: "#c00",
    fontSize: 16,
  },
  successBox: {
    maxWidth: 480,
    padding: 32,
    backgroundColor: "#fff",
    border: "1px solid #e0e0d8",
    borderRadius: 4,
    textAlign: "center",
  },
  successText: {
    margin: 0,
    fontSize: 16,
    color: "#333",
    lineHeight: 1.6,
  },
};
