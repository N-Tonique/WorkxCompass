import Link from "next/link";
import { ArrowLeft, BookOpen, Compass } from "lucide-react";
import { listQuartzNotes } from "@/lib/quartz-content";

export const dynamic = "force-dynamic";

export default async function NotesLibraryPage() {
  const notes = await listQuartzNotes();

  return (
    <div className="ingest-shell relative min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(46,196,182,0.28),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(14,90,120,0.55),transparent_70%)] blur-2xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white">
          <Compass className="h-5 w-5 text-[var(--accent-bright)]" />
          <span className="text-sm">Knowledge Compass</span>
        </Link>
        <Link
          href="/ingest"
          className="inline-flex items-center gap-2 text-sm text-[var(--accent-bright)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Ingest
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent-bright)]/85">
            Markdown garden
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
            Browse notes
          </h1>
          <p className="mt-3 text-white/65">
            {notes.length} fichiers Markdown rendus dans le navigateur.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <li key={note.filename}>
              <Link
                href={`/notes/${encodeURIComponent(note.filename)}`}
                className="block h-full min-w-0 rounded-2xl border border-white/12 bg-[#041820]/55 p-4 transition hover:border-[var(--accent)]/50 hover:bg-[#041820]/80"
              >
                <div className="mb-2 flex items-center gap-2 text-[var(--accent-bright)]">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs uppercase tracking-wide text-white/45">
                    {note.filename}
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
                  {note.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">
                  {note.excerpt}
                </p>
                {note.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {note.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/55"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
