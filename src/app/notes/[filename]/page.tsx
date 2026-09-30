import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Compass, Network } from "lucide-react";
import { listQuartzNotes, readQuartzNote } from "@/lib/quartz-content";
import { MarkdownView } from "@/components/notes/markdown-view";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ filename: string }>;
};

export default async function NotePage({ params }: PageProps) {
  const { filename: raw } = await params;
  const filename = decodeURIComponent(raw);

  let note: Awaited<ReturnType<typeof readQuartzNote>>;
  try {
    note = await readQuartzNote(filename);
  } catch {
    notFound();
  }

  const all = await listQuartzNotes();
  const byTitle = new Map(all.map((n) => [n.title, n.filename]));

  return (
    <div className="ingest-shell relative min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-[-8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(46,196,182,0.22),transparent_70%)] blur-2xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/notes" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          All notes
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/60 hover:text-white">
            <Compass className="h-5 w-5 text-[var(--accent-bright)]" />
          </Link>
          <a
            href={`http://localhost:8080/${encodeURIComponent(note.title.toLowerCase().replace(/\s+/g, "-"))}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-bright)] hover:text-white"
            title="Open in Quartz if running"
          >
            <Network className="h-4 w-4" />
            Quartz
          </a>
        </div>
      </header>

      <article className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
          {note.filename}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-white sm:text-4xl">
          {note.title}
        </h1>
        {note.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-xs text-[var(--accent-bright)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="md-doc mt-8 rounded-2xl border border-white/10 bg-[#03151c]/70 p-5 sm:p-8">
          <MarkdownView markdown={note.body} titleToFilename={Object.fromEntries(byTitle)} />
        </div>

        {note.links.length > 0 ? (
          <aside className="mt-8">
            <h2 className="text-sm uppercase tracking-[0.16em] text-white/45">
              Linked notes
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {note.links.map((link) => {
                const target = byTitle.get(link);
                return target ? (
                  <li key={link}>
                    <Link
                      href={`/notes/${encodeURIComponent(target)}`}
                      className="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-[var(--accent-bright)] hover:border-[var(--accent)]/50"
                    >
                      [[{link}]]
                    </Link>
                  </li>
                ) : (
                  <li
                    key={link}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/40"
                  >
                    [[{link}]]
                  </li>
                );
              })}
            </ul>
          </aside>
        ) : null}
      </article>
    </div>
  );
}
