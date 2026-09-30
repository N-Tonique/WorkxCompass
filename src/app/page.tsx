import Link from "next/link";
import { ArrowRight, Compass, Network } from "lucide-react";

export default function Home() {
  return (
    <main className="ingest-shell relative flex min-h-screen items-center overflow-hidden px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-12%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(46,196,182,0.3),transparent_68%)] blur-2xl" />
        <div className="absolute bottom-[-18%] right-[-6%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(12,84,112,0.5),transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:80px_80px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/75">
          <Compass className="h-4 w-4 text-[var(--accent-bright)]" />
          SD Worx · Tectonic Hackathon
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Knowledge Compass
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
          We turn fragmented organizational knowledge into a connected knowledge
          layer, then project the right part of that knowledge into the
          employee&apos;s current context.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/ingest"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#032029] transition hover:brightness-110"
          >
            Ingest sources
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm text-white transition hover:border-white/40"
          >
            <Network className="h-4 w-4 text-[var(--accent-bright)]" />
            Open Quartz graph
          </a>
        </div>

        <p className="mt-8 text-sm text-white/45">
          Requires Vertex AI ADC (
          <code className="text-[var(--accent-bright)]">GOOGLE_CLOUD_PROJECT</code> +{" "}
          <code className="text-white/70">gcloud auth application-default login</code>
          ) and{" "}
          <code className="text-[var(--accent-bright)]">npm run quartz:dev</code> for the
          knowledge graph.
        </p>
      </div>
    </main>
  );
}
