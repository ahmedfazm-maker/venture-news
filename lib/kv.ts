import { kv } from "@vercel/kv";

export type JobStatus =
  | "started"
  | "signals_ready"
  | "draft_generating"
  | "awaiting_review"
  | "approved"
  | "sent"
  | "failed";

export interface Signal {
  title: string;
  url: string;
  source: string;
  summary: string;
  score: number;
  relevance_reason: string;
  published_at?: string;
}

export interface DraftSection {
  id: string;
  name: string;
  content: string;
}

export interface Job {
  status: JobStatus;
  week: string;
  started_at: string;
  signals?: Signal[];
  draft?: {
    subject_line: string;
    preview_text: string;
    sections: DraftSection[];
  };
  review_token?: string;
  beehiiv_post_id?: string;
  error?: string;
}

const KEY = "job:current";

export async function getJob(): Promise<Job | null> {
  return kv.get<Job>(KEY);
}

export async function setJob(job: Job): Promise<void> {
  await kv.set(KEY, job);
}

export async function updateJob(updates: Partial<Job>): Promise<Job> {
  const existing = await getJob();
  const updated = { ...existing, ...updates } as Job;
  await kv.set(KEY, updated);
  return updated;
}

export async function clearJob(): Promise<void> {
  await kv.del(KEY);
}
