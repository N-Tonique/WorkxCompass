export type Source = {
  id: string;
  name: string;
  type: "PDF / Manuel" | "Teams / Discussion" | "Note d’expert";
  origin: string;
  excerpt: string;
  author: string;
  date: string;
  locator: string;
};
export type Knowledge = {
  id: string;
  title: string;
  summary: string;
  rule: string;
  exception: string;
  procedure: string[];
  context: Record<string, string>;
  sources: Source[];
  score: number;
  reasons: string[];
  conflict?: { title: string; sourceIds: [string, string]; status: string; explanation: string };
};
export type RefinementField = { id: string; label: string; options: string[] };
export type Intent = {
  id: string;
  title: string;
  description: string;
  domain: "Payroll" | "Time";
  topic: string;
  icon: "bonus" | "payroll" | "time" | "termination";
  scenario: "bonus" | "termination" | "overtime";
  fields: RefinementField[];
};
export type Profile = { id: string; name: string; initials: string; role: string; country: string; countryCode: string; domain: string; intentIds: string[] };

export const profiles: Profile[] = [
  { id: "julie", name: "Julie Martin", initials: "JM", role: "Payroll officer", country: "Belgique", countryCode: "BE", domain: "Payroll", intentIds: ["bonus", "payroll", "overtime"] },
  { id: "camille", name: "Camille Bernard", initials: "CB", role: "Responsable paie", country: "France", countryCode: "FR", domain: "Payroll", intentIds: ["termination", "documents"] },
  { id: "thomas", name: "Thomas Peeters", initials: "TP", role: "HR business partner", country: "Belgique", countryCode: "BE", domain: "Time", intentIds: ["overtime", "bonus", "payroll"] },
];
const bonusFields: RefinementField[] = [
  { id: "employee", label: "Employé", options: ["Marc Dupont", "Sophie Laurent"] },
  { id: "information", label: "Type d’information", options: ["Conditions d’attribution", "Calcul et versement"] },
  { id: "period", label: "Période", options: ["2026", "2025"] },
];
const terminationFields: RefinementField[] = [
  { id: "contract", label: "Contrat", options: ["CDI"] },
  { id: "information", label: "Type d’information", options: ["Procédure de départ", "Documents à remettre"] },
  { id: "reason", label: "Motif", options: ["Démission", "Rupture conventionnelle"] },
];
export const intents: Intent[] = [
  { id: "bonus", title: "Comprendre les bonus", description: "Retrouvez les conditions d’attribution et les règles applicables à votre équipe.", domain: "Payroll", topic: "Bonus", icon: "bonus", scenario: "bonus", fields: bonusFields },
  { id: "payroll", title: "Préparer le versement", description: "Vérifiez le calcul et les étapes de versement d’un bonus en paie.", domain: "Payroll", topic: "Bonus", icon: "payroll", scenario: "bonus", fields: bonusFields.map(field => field.id === "information" ? { ...field, options: [...field.options].reverse() } : field) },
  { id: "overtime", title: "Gérer les heures supplémentaires", description: "Explorez les majorations, les exceptions et les accords de votre secteur.", domain: "Time", topic: "Overtime", icon: "time", scenario: "overtime", fields: [
    { id: "information", label: "Type d’information", options: ["Conditions", "Procédure de validation"] },
    { id: "period", label: "Période", options: ["2026", "2025"] },
    { id: "sector", label: "Secteur", options: ["Construction"] },
    { id: "day", label: "Jour travaillé", options: ["Samedi", "Dimanche"] },
  ] },
  { id: "termination", title: "Accompagner un départ", description: "Identifiez les étapes et les points de vigilance d’une fin de contrat.", domain: "Payroll", topic: "Termination", icon: "termination", scenario: "termination", fields: terminationFields },
  { id: "documents", title: "Préparer les documents", description: "Retrouvez les pièces à remettre et leur circuit de vérification.", domain: "Payroll", topic: "Termination", icon: "payroll", scenario: "termination", fields: terminationFields.map(field => field.id === "information" ? { ...field, options: [...field.options].reverse() } : field) },
];
const knowledge: Record<Intent["scenario"], Knowledge> = {
  bonus: {
    id: "KC-BE-014", title: "Bonus annuel : conditions d’attribution",
    summary: "Vérifiez l’éligibilité du collaborateur et les validations nécessaires avant le passage en paie du bonus annuel.",
    rule: "Dans cette politique fictive, le bonus dépend des objectifs validés et du temps de présence sur l’exercice. Le montant doit être approuvé par le responsable avant transmission à l’équipe payroll.",
    exception: "Une arrivée en cours d’année ou une absence prolongée nécessite une vérification individuelle du prorata avec l’équipe RH.",
    procedure: ["Vérifier les objectifs et la période de présence.", "Faire approuver le montant par le responsable.", "Transmettre la validation à payroll avant la clôture."],
    context: { Pays: "BE", Domaine: "Payroll", Sujet: "Bonus", Profil: "Employé" },
    score: 96, reasons: ["Pays correspondant : Belgique", "Domaine correspondant : Payroll", "Intention correspondant au bonus", "Manuel interne disponible"],
    sources: [
      { id: "bonus-policy", name: "Politique de rémunération", type: "PDF / Manuel", origin: "SharePoint · RH Belgique", locator: "Section 4.2 · p. 18", author: "Équipe Compensation & Benefits", date: "12 septembre 2026", excerpt: "Le bonus annuel est soumis à la validation des objectifs et du montant par le responsable. Le temps de présence est pris en compte." },
      { id: "bonus-teams", name: "Clôture des bonus annuels", type: "Teams / Discussion", origin: "Teams · Payroll Belgique", locator: "Fil « Préparation des bonus »", author: "Sophie Lambert", date: "18 septembre 2026", excerpt: "Merci de joindre l’approbation du manager à chaque demande de versement avant la clôture payroll." },
      { id: "bonus-expert", name: "Vérifier le prorata", type: "Note d’expert", origin: "Knowledge Compass · Contributions", locator: "Note BE-024", author: "Sophie Lambert", date: "20 septembre 2026", excerpt: "Pour une arrivée en cours d’année, vérifier le prorata individuellement avec RH avant validation définitive du bonus." },
    ],
  },
  termination: {
    id: "KC-FR-028", title: "Départ d’un salarié : préparer la clôture",
    summary: "Coordonnez les informations de départ, les contrôles payroll et les documents de clôture dans un même parcours.",
    rule: "Dans ce processus fictif, RH confirme le motif et la date de fin avant tout calcul de clôture. Payroll contrôle les éléments variables et les congés restants.",
    exception: "Un désaccord sur la date, le solde ou le motif suspend la validation interne et nécessite l’avis du référent RH.",
    procedure: ["Confirmer la date et le motif du départ avec RH.", "Contrôler les variables et le solde de congés.", "Préparer puis faire vérifier les documents de sortie."],
    context: { Pays: "FR", Domaine: "Payroll", Sujet: "Termination", Profil: "Salarié" },
    score: 94, reasons: ["Pays correspondant : France", "Domaine correspondant : Payroll", "Intention correspondant à une fin de contrat", "Procédure RH documentée"],
    sources: [
      { id: "departure-policy", name: "Guide des départs", type: "PDF / Manuel", origin: "SharePoint · RH France", locator: "Chapitre 3 · p. 12", author: "Équipe RH France", date: "2 septembre 2026", excerpt: "Le dossier de départ est ouvert après confirmation par RH du motif et de la date de fin du contrat." },
      { id: "departure-teams", name: "Checklist de sortie", type: "Teams / Discussion", origin: "Teams · Payroll France", locator: "Fil « Contrôles de sortie »", author: "Marc Durand", date: "15 septembre 2026", excerpt: "Contrôler les variables et le solde de congés avant de préparer les documents de sortie." },
      { id: "departure-expert", name: "Validation du dossier", type: "Note d’expert", origin: "Knowledge Compass · Contributions", locator: "Note FR-018", author: "Marc Durand", date: "21 septembre 2026", excerpt: "En cas de désaccord sur la date ou les montants, faire revoir le dossier par le référent RH avant validation." },
    ],
  },
  overtime: {
    id: "KC-BE-042", title: "Heures supplémentaires : travail du samedi",
    summary: "Deux sources divergent sur la majoration du samedi dans le secteur de la construction. Une validation experte est nécessaire avant application.",
    rule: "Le manuel fictif prévoit une majoration de 50 % pour le samedi. Une discussion Teams mentionne 100 % pour un chantier spécifique, sans accord joint. Cette divergence reste à arbitrer.",
    exception: "Un accord spécifique au chantier pourrait modifier la majoration. Son existence et son périmètre doivent être confirmés ; la discussion seule ne vaut pas validation.",
    procedure: ["Récupérer les heures et l’accord préalable du responsable.", "Vérifier l’existence d’un accord spécifique au chantier.", "Faire arbitrer la divergence par l’expert avant transmission à payroll."],
    context: { Pays: "BE", Domaine: "Time", Sujet: "Overtime", Profil: "Ouvrier", Secteur: "Construction" },
    score: 92, reasons: ["Pays correspondant : Belgique", "Domaine correspondant : Time", "Sujet correspondant aux heures supplémentaires", "Secteur correspondant : Construction"],
    sources: [
      { id: "time-policy", name: "Manuel du temps de travail", type: "PDF / Manuel", origin: "SharePoint · RH Belgique", locator: "Section 6.3 · p. 24", author: "Équipe Time & Attendance", date: "1 septembre 2026", excerpt: "Les heures supplémentaires du samedi sont majorées de 50 %. Le dimanche, la majoration prévue est de 100 %." },
      { id: "time-teams", name: "Travail du samedi · chantier Nord", type: "Teams / Discussion", origin: "Teams · Opérations Construction", locator: "Fil « Chantier Nord » · message 14", author: "Pieter Janssens", date: "19 septembre 2026", excerpt: "Pour le chantier Nord, les heures de ce samedi sont majorées de 100 %, selon l’accord évoqué en réunion." },
      { id: "time-expert", name: "Accords propres aux chantiers", type: "Note d’expert", origin: "Knowledge Compass · Contributions", locator: "Note BE-031", author: "Eline Peeters", date: "22 septembre 2026", excerpt: "Avant d’appliquer un taux propre à un chantier, obtenir l’accord écrit et vérifier les travailleurs et les dates couverts." },
    ],
    conflict: { title: "50 % ou 100 % pour le samedi ?", sourceIds: ["time-policy", "time-teams"], status: "À valider par un expert", explanation: "Le manuel décrit la règle générale, tandis que Teams évoque un accord local non joint. Impossible de confirmer que cet accord s’applique : les deux affirmations sont conservées, sans arbitrage automatique." },
  },
};

export function defaultRefinements(intent: Intent): Record<string, string> {
  return Object.fromEntries(intent.fields.map(field => [field.id, field.options[0]]));
}

// Replace this fixture adapter with the backend projection when available.
export function projectKnowledge(intent: Intent, values: Record<string, string>): Knowledge | null {
  if (intent.fields.some(field => !field.options.includes(values[field.id]))) return null;
  // No historical evidence is supplied: never apply 2026 sources to 2025.
  if (values.period === "2025") return null;
  const base = knowledge[intent.scenario];
  const result: Knowledge = { ...base, context: { ...base.context, ...Object.fromEntries(intent.fields.map(field => [field.label, values[field.id]])) }, procedure: [...base.procedure] };
  if (intent.scenario === "bonus" && values.information === "Calcul et versement") {
    result.title = "Bonus annuel : calcul et versement";
    result.summary = `Préparez le versement du bonus de ${values.employee} pour ${values.period} : montant approuvé, prorata vérifié et transmission avant clôture.`;
    result.rule = "Le montant retenu est celui approuvé par le responsable, après vérification du temps de présence. Cette démo ne calcule aucun montant : les données salariales ne sont pas disponibles.";
  }
  if (intent.scenario === "termination") {
    result.procedure[0] = values.reason === "Démission" ? "Faire confirmer la réception de la démission et la date de départ par RH." : "Faire confirmer par RH la validation de la rupture conventionnelle et sa date d’effet.";
    if (values.information === "Documents à remettre") {
      result.title = "Départ d’un salarié : documents de sortie";
      result.summary = "Réunissez les documents du dossier de sortie, puis faites vérifier leur contenu par RH avant remise au salarié.";
    }
  }
  if (intent.scenario === "overtime" && values.day === "Dimanche") {
    result.title = "Heures supplémentaires : travail du dimanche";
    result.summary = "Le manuel de démonstration prévoit une majoration de 100 % le dimanche. La discussion relative au samedi ne s’applique pas à ce cas.";
    result.rule = "Dans le manuel fictif, les heures supplémentaires du dimanche sont majorées de 100 %. Vérifier l’accord écrit et les heures approuvées avant transmission.";
    result.sources = base.sources.filter(source => source.id !== "time-teams");
    result.conflict = undefined;
    result.procedure[2] = "Transmettre les heures et les justificatifs validés à payroll.";
  }
  if (intent.scenario === "overtime" && values.information === "Procédure de validation") {
    result.title = `Valider les heures supplémentaires du ${values.day.toLowerCase()}`;
    result.summary = "Commencez par l’accord du responsable, réunissez les justificatifs puis vérifiez le taux applicable avant transmission à payroll.";
  }
  return result;
}
