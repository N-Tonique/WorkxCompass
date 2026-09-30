import type { GraphCard, GraphRelation } from "@/types/knowledge";

const knownConflictPairs = new Set([
  "be-payroll-bonus-01--be-payroll-bonus-02",
  "be-time-overtime-01--be-time-overtime-02",
]);

const same = (left?: string, right?: string) => Boolean(left && right && left === right);

export function getRelations(
  cardA: GraphCard,
  cardB: GraphCard,
): GraphRelation | null {
  const pairId = `${cardA.id}--${cardB.id}`;
  const reasons: string[] = [];
  let score = 0;

  if (same(cardA.classification.pays, cardB.classification.pays)) {
    score += 2;
    reasons.push("same country");
  }
  if (same(cardA.classification.domaine, cardB.classification.domaine)) {
    score += 2;
    reasons.push("same domain");
  }
  if (same(cardA.knowledgeType, cardB.knowledgeType)) {
    score += 4;
    reasons.push("same knowledge type");
  }
  if (same(cardA.classification.client, cardB.classification.client)) {
    score += 2;
    reasons.push("same client");
  }

  if (knownConflictPairs.has(pairId)) {
    return {
      sourceId: cardA.id,
      targetId: cardB.id,
      kind: "conflict_candidate",
      reason: "Potential conflict declared in the source set",
      status: "candidate",
      score,
    };
  }

  return score > 0
    ? {
        sourceId: cardA.id,
        targetId: cardB.id,
        kind: "same_scope",
        reason: reasons.join("; "),
        status: "candidate",
        score,
      }
    : null;
}

export function buildRelations(cards: GraphCard[]): GraphRelation[] {
  return cards.flatMap((card, index) =>
    cards
      .slice(index + 1)
      .map((otherCard) => getRelations(card, otherCard))
      .filter((relation): relation is GraphRelation => relation !== null),
  );
}
