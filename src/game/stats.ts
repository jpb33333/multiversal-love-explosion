// Per-session-ish scoreboard in localStorage (persists across reloads, cleared
// by the player). Each finished game appends one record; the title screen shows
// the best of the deck. Mirrors BW's stats.ts API surface; uses localStorage
// instead of a session cookie (per the plan).

export type OutcomeKind = 'love_explosion' | 'entropy_collapse';

export interface GameRecord {
  outcome: OutcomeKind;
  score: number;
  peakLoveShare: number; // 0..1
  duration: number; // sim seconds at resolution
  ts: number; // Date.now() at resolution
}

export interface StatsSummary {
  total: number;
  wins: number;
  losses: number;
  bestScore: number | null;
  bestPeakShare: number | null; // 0..1
}

const KEY = 'mle-stats-v1';
const MAX_GAMES = 100;

function load(): GameRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as GameRecord[];
  } catch {
    // malformed — drop it
  }
  return [];
}

function save(records: GameRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed =
    records.length > MAX_GAMES ? records.slice(records.length - MAX_GAMES) : records;
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // storage full / disabled — non-fatal
  }
}

export function recordGame(rec: GameRecord): void {
  const records = load();
  records.push(rec);
  save(records);
}

export function summarize(): StatsSummary {
  const records = load();
  let wins = 0;
  let bestScore: number | null = null;
  let bestPeakShare: number | null = null;
  for (const r of records) {
    if (r.outcome === 'love_explosion') wins++;
    if (bestScore === null || r.score > bestScore) bestScore = r.score;
    if (bestPeakShare === null || r.peakLoveShare > bestPeakShare) bestPeakShare = r.peakLoveShare;
  }
  return {
    total: records.length,
    wins,
    losses: records.length - wins,
    bestScore,
    bestPeakShare,
  };
}
