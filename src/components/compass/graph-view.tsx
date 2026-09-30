import { useMemo } from "react";
import { Globe2, Network } from "lucide-react";
import { knowledgeCards } from "@/data/knowledge-cards";
import { buildRelations } from "@/lib/relations";
import { KnowledgeGraph } from "@/components/knowledge-graph/knowledge-graph";
import type { Intent, Profile } from "@/lib/compass-data";

export function GraphView({ profile, intent }: { profile: Profile; intent: Intent | null }) {
  const domain = intent?.domain;
  const { cards, relations } = useMemo(() => {
    const cards = knowledgeCards.filter(card => card.classification.pays === profile.countryCode && (!domain || card.classification.domaine === domain));
    return { cards, relations: buildRelations(cards) };
  }, [profile.countryCode, domain]);
  const conflicts = relations.filter(relation => relation.kind === "conflict_candidate").length;

  return <section className="graph-view"><div className="view-heading"><span className="intent-icon"><Network size={25} /></span><h1 tabIndex={-1}>Graphe de connaissances</h1><p>{cards.length} connaissances et {relations.length} relations dans votre contexte{conflicts > 0 && <>, dont <strong>{conflicts} conflit{conflicts > 1 ? "s" : ""} potentiel{conflicts > 1 ? "s" : ""}</strong> en orange</>}.</p><div className="context-pills"><span><Globe2 size={14} />{profile.country}</span><span>{domain ?? "Tous les domaines"}</span></div></div>
    <KnowledgeGraph cards={cards} relations={relations} /></section>;
}
