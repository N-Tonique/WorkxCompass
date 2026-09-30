"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, LoaderCircle, ScanSearch } from "lucide-react";
import { UploadZone } from "@/components/ingest/upload-zone";
import {
  IngestPreview,
  type IngestPreviewData,
} from "@/components/ingest/ingest-preview";
import { NotesRail, type NoteSummary } from "@/components/ingest/notes-rail";

export default function IngestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IngestPreviewData | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [quartzUrl, setQuartzUrl] = useState("http://localhost:8080");

  const refreshNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes ?? []);
        if (data.quartzUrl) setQuartzUrl(data.quartzUrl);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);

  const canSubmit = useMemo(
    () => Boolean(selectedFile) && !loading,
    [selectedFile, loading],
  );

  async function runIngest() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("file", selectedFile);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ingestion failed.");
        setPreview(null);
        return;
      }
      setPreview({
        title: data.title,
        markdown: data.markdown,
        links: data.links ?? [],
        filename: data.filename,
        warning: data.warning,
        mode: data.mode,
        detected: data.detected,
        action: data.action,
        knowledgeType: data.knowledgeType,
        resume: data.resume,
        alertes: data.alertes,
        written: data.written,
        cardId: data.cardId,
      });
      if (data.written) {
        await refreshNotes();
      }
    } catch {
      setError("Network error while calling /api/ingest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ingest-shell relative min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(46,196,182,0.28),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(14,90,120,0.55),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-white/80 transition hover:text-white">
          <Compass className="h-5 w-5 shrink-0 text-[var(--accent-bright)]" />
          <span className="truncate text-sm tracking-wide">Knowledge Compass</span>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/notes"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Browse Markdown
          </Link>
          <a
            href={quartzUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-bright)] transition hover:text-white"
          >
            Open Quartz graph
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 pt-2 sm:gap-8 sm:px-6 sm:pt-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <section className="min-w-0 space-y-6 sm:space-y-8">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent-bright)]/85">
              SD Worx · FIND
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
              Knowledge Compass
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Drop a source. The engine auto-detects file type, language,
              country, domain and topic — then writes a connected Quartz note.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/12 bg-[#041820]/55 p-4 backdrop-blur-md sm:p-5">
            <ScanSearch className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-bright)]" />
            <div className="min-w-0">
              <p className="font-medium text-white">Auto-detection enabled</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                No manual context needed. Type, language and business attributes
                are inferred from the file content and filename.
              </p>
            </div>
          </div>

          <UploadZone
            disabled={loading}
            onFileSelected={(file) => {
              setSelectedFile(file);
              setError(null);
            }}
          />

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void runIngest()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#032029] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Detecting & transforming…" : "Analyze source"}
            </button>
            {selectedFile ? (
              <p className="min-w-0 flex-1 truncate text-sm text-white/60">
                Selected: <span className="text-white">{selectedFile.name}</span>
              </p>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-white/45 break-words">
                Tip: run <code className="text-[var(--accent-bright)]">npm run quartz:dev</code> for the graph
              </p>
            )}
          </div>

          <IngestPreview data={preview} loading={loading} error={error} />
        </section>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <NotesRail
            notes={notes}
            quartzUrl={quartzUrl}
            onDeleted={(filename, nextNotes) => {
              setNotes(nextNotes);
              setPreview((prev) =>
                prev?.filename === filename ? null : prev,
              );
            }}
          />
        </div>
      </main>
    </div>
  );
}
