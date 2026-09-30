export type GraphCard = {
  id: string;
  title: string;
  summary: string;
  source: {
    format: "pdf" | "email_msg" | "teams";
    uri: string;
    markdownPath: string;
    revisionId: string;
  };
  classification: {
    domaine: string;
    sousDomaine: string;
    profilEmploye?: string;
    secteurCp?: string;
    pays?: string;
    client?: string;
    validFrom?: string;
    validUntil?: string;
  };
  knowledgeType: string;
  decisionStatus: "unreviewed" | "needs_expert" | "approved";
};

export type GraphRelation = {
  sourceId: string;
  targetId: string;
  kind:
    | "same_scope"
    | "explicit_reference"
    | "evidence"
    | "conflict_candidate"
    | "supersedes_candidate";
  reason: string;
  status: "candidate" | "approved";
  score?: number;
};

export type WorkContext = {
  country: "BE" | "FR";
  domain: "Payroll" | "Time";
  topic: string;
  year: number;
  client?: string;
};
