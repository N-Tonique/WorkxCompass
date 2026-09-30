"use client";

import { useCallback, useState } from "react";
import { FileUp, Upload } from "lucide-react";

type UploadZoneProps = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function UploadZone({ disabled, onFileSelected }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <label
      className={[
        "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed px-6 py-10 text-center transition",
        dragging
          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
          : "border-white/25 bg-white/5 hover:border-white/45 hover:bg-white/8",
        disabled ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(46,196,182,0.18),transparent_55%)]" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent-bright)] shadow-[0_0_0_1px_rgba(46,196,182,0.35)]">
        {dragging ? <Upload className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
      </div>
      <div className="relative space-y-2">
        <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-white">
          Drop a source here
        </p>
        <p className="max-w-md text-sm leading-relaxed text-white/65">
          PDF, Markdown, text, CSV, or images. Type, language and business
          context are detected automatically.
        </p>
      </div>
      <input
        type="file"
        className="sr-only"
        disabled={disabled}
        accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,text/markdown,text/csv,image/*"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </label>
  );
}
