import { experts, type Expert } from "@/data/experts";
import type { WorkContext } from "@/types/knowledge";

export type ExpertContext = Pick<WorkContext, "country" | "domain" | "topic">;

export type ExpertRecommendation = {
  expert: Expert;
  score: number;
};

const matches = (values: string[], target: string) =>
  values.some((value) => value.toLowerCase() === target.toLowerCase());

const contextScore = (expert: Expert, context: ExpertContext) =>
  (matches(expert.countries, context.country) ? 5 : 0) +
  (matches(expert.domains, context.domain) ? 4 : 0) +
  (matches(expert.topics, context.topic) ? 6 : 0);

export function getRecommendedExperts(
  context: ExpertContext,
): ExpertRecommendation[] {
  const recommendations = experts
    .map((expert) => ({
      expert,
      score: contextScore(expert, context) + Math.min(expert.solvedCases, 100) / 100,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.expert.solvedCases - left.expert.solvedCases,
    );

  if (recommendations.every(({ expert }) => contextScore(expert, context) === 0)) {
    const fallback = recommendations.find(
      ({ expert }) => expert.id === "knowledge-support",
    );

    return fallback ? [{ ...fallback, score: 0 }] : [];
  }

  return recommendations;
}
