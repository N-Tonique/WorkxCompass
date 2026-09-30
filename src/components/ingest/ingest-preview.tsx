"use client";

import { Link2, Sparkles } from "lucide-react";

export type DetectedPreview = {
  sourceType?: string;
  language?: string;
  country?: string;
  domain?: string;
  topic?: string;
  fileKind?: string;
};

export type IngestPreviewData = {
  title: string;
  markdown: string;
  links: string[];
  filename: string;
  warning?: string;
  mode?: string;
  detected?: DetectedPreview;
};

type IngestPreviewProps = {
  data: IngestPreviewData | null;
  loading?: boolean;
  error?: string | null;
};

export function IngestPreview({ data, loading, error }: IngestPreviewProps) {
  if (loading) {
    return (
      <div className="min-w-0 rounded-2xl border border-white/15 bg-white/5 p-4 sm:p-6">
        <div className="flex items-center gap-3 text-[var(--accent-bright)]">
          <Sparkles className="h-5 w-5 shrink-0 animate-pulse" />
          <p className="font-[family-name:var(--font-display)] text-lg">
            Detecting type, language & context…
          </p>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-3 w-2/3 max-w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-3 w-5/6 max-w-full animate-pulse rounded bg-white/10" />
          <div className="h-40 animate-pulse rounded-xl bg-white/8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100 sm:p-6">
        <p className="font-[family-name:var(--font-display)] text-lg">Ingestion failed</p>
        <p className="mt-2 max-h-64 overflow-auto break-words text-sm leading-relaxed text-rose-100/80 whitespace-pre-wrap">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/55 sm:p-6">
        <p className="font-[family-name:var(--font-display)] text-lg text-white/75">
          Preview
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          After analysis, auto-detected attributes and Markdown will appear here.
        </p>
      </div>
    );
  }

  const chips = [
    data.detected?.fileKind && `file: ${data.detected.fileKind}`,
    data.detected?.sourceType && `type: ${data.detected.sourceType}`,
    data.detected?.language && `lang: ${data.detected.language}`,
    data.detected?.country && `country: ${data.detected.country}`,
    data.detected?.domain && `domain: ${data.detected.domain}`,
    data.detected?.topic && `topic: ${data.detected.topic}`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#041820]/70 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-bright)]/80">
          Written to quartz/content
          {data.mode === "local-fallback" ? " · local fallback" : ""}
        </p>
        <h3 className="mt-1 break-words font-[family-name:var(--font-display)] text-xl text-white sm:text-2xl">
          {data.title}
        </h3>
        <p className="mt-1 truncate text-sm text-white/50" title={data.filename}>
          {data.filename}
        </p>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-xs text-[var(--accent-bright)]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {data.warning ? (
          <p className="mt-3 max-h-32 overflow-auto break-words rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
            {data.warning}
          </p>
        ) : null}
      </div>

      {data.links.length > 0 && (
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-white/70">
            <Link2 className="h-4 w-4 shrink-0 text-[var(--accent-bright)]" />
            Detected connections
          </div>
          <div className="flex flex-wrap gap-2">
            {data.links.map((link) => (
              <span
                key={link}
                className="max-w-full break-all rounded-md border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-2.5 py-1 text-xs text-[var(--accent-bright)]"
              >
                [[{link}]]
              </span>
            ))}
          </div>
        </div>
      )}

      <pre className="max-h-[min(420px,50vh)] overflow-auto px-4 py-5 text-[12px] leading-relaxed break-words whitespace-pre-wrap text-teal-50/85 sm:px-6 sm:text-[13px]">
        {data.markdown}
      </pre>
    </div>
  );
}
