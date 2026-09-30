import Image from "next/image";

import type { ExpertRecommendation } from "@/lib/expert-ranking";

type ExpertCardProps = {
  recommendation: ExpertRecommendation;
  featured?: boolean;
};

export function ExpertCard({ recommendation, featured = false }: ExpertCardProps) {
  const { expert, score } = recommendation;
  const isFallback = expert.id === "knowledge-support";
  const expertise = [
    expert.countries.join(" · "),
    expert.domains.join(" · "),
  ].filter(Boolean).join(" · ") || "General support";

  return (
    <article
      className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm ${
        featured
          ? "border-blue-500/50 bg-blue-50/50 shadow-blue-100"
          : isFallback
            ? "border-dashed border-black/10 bg-zinc-50"
            : "border-black/10 bg-white"
      }`}
    >
      <Image
        src={expert.avatarUrl}
        alt={`Avatar de ${expert.name}`}
        width={64}
        height={64}
        className="size-16 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold tracking-tight">{expert.name}</h2>
            <p className="text-sm text-black/60">{expertise}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              isFallback
                ? "bg-zinc-200 text-zinc-600"
                : featured
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            Score {Math.round(score)}
          </span>
        </div>

        <p className="mt-2 text-sm text-black/70">
          {expert.topics.length > 0 ? expert.topics.join(" · ") : "General support"}
          {" · "}
          {expert.solvedCases} solved cases
        </p>
      </div>
    </article>
  );
}
