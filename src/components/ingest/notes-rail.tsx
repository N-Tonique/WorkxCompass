"use client";

import { useState } from "react";
import { LoaderCircle, Network, Trash2 } from "lucide-react";

export type NoteSummary = {
  slug: string;
  title: string;
  filename: string;
  tags: string[];
  links: string[];
  excerpt: string;
};

type NotesRailProps = {
  notes: NoteSummary[];
  quartzUrl: string;
  onDeleted?: (filename: string, notes: NoteSummary[]) => void;
};

export function NotesRail({ notes, quartzUrl, onDeleted }: NotesRailProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(note: NoteSummary) {
    if (note.filename.toLowerCase() === "index.md") return;
    const ok = window.confirm(`Delete “${note.title}”? This cannot be undone.`);
    if (!ok) return;

    setPending(note.filename);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: note.filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Delete failed.");
        return;
      }
      onDeleted?.(note.filename, data.notes ?? []);
    } catch {
      setError("Network error while deleting.");
    } finally {
      setPending(null);
    }
  }

  return (
    <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-4 backdrop-blur-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Quartz garden
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
            Connected notes
          </h2>
        </div>
        <a
          href={quartzUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#032029] transition hover:brightness-110"
        >
          <Network className="h-4 w-4" />
          Graph
        </a>
      </div>

      {error ? (
        <p className="mb-3 break-words rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      ) : null}

      <ul className="max-h-[min(70vh,640px)] space-y-3 overflow-y-auto overscroll-contain pr-1">
        {notes.length === 0 && (
          <li className="text-sm text-white/50">No notes yet in quartz/content.</li>
        )}
        {notes.map((note) => {
          const protectedIndex = note.filename.toLowerCase() === "index.md";
          const busy = pending === note.filename;
          return (
            <li
              key={note.filename}
              className="min-w-0 rounded-xl border border-white/10 bg-[#03151c]/55 p-3 transition hover:border-[var(--accent)]/40"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white" title={note.title}>
                    {note.title}
                  </p>
                  <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-white/55">
                    {note.excerpt}
                  </p>
                  {note.links.length > 0 && (
                    <p className="mt-2 text-[11px] text-[var(--accent-bright)]/80">
                      {note.links.length} link{note.links.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {!protectedIndex ? (
                  <button
                    type="button"
                    title="Delete note"
                    disabled={busy || pending !== null}
                    onClick={() => void handleDelete(note)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/55 transition hover:border-rose-300/40 hover:bg-rose-500/15 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/35">
                    index
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
