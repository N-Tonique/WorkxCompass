"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronDown, FileText, Fingerprint, GitCompareArrows, MessageSquare, Quote, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react";
import type { Knowledge, Source } from "@/lib/compass-data";

function DetailDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="detail-dialog" aria-labelledby="dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-content"><div className="dialog-header"><span className="small-label">Traçabilité de la connaissance</span><button className="icon-button" onClick={onClose} aria-label="Fermer les détails"><X size={21} /></button></div><h2 id="dialog-title">{title}</h2>{children}</div></dialog>;
}

export function Evidence({ source }: { source: Source }) {
  return <div className="evidence"><span className="small-label"><Quote size={15} />Extrait utilisé comme preuve</span><blockquote>« {source.excerpt} »</blockquote><p>{source.locator}</p></div>;
}

function SourceDetails({ source }: { source: Source }) {
  return <><span className="source-type">{source.type}</span><dl className="source-metadata"><div><dt>Provenance</dt><dd>{source.origin}</dd></div><div><dt>Auteur</dt><dd>{source.author}</dd></div><div><dt>Date</dt><dd>{source.date}</dd></div></dl><Evidence source={source} /><p className="demo-note">Source fictive · aucun document externe n’est connecté.</p></>;
}

export function Sources({ sources, onSelect }: { sources: Source[]; onSelect: (source: Source) => void }) {
  return <section className="sources-section"><div className="section-heading"><h3>Sources utilisées <span className="count">{sources.length}</span></h3><span className="quiet-label">Consulter les preuves</span></div><div className="source-list">{sources.map(source => {
    const Icon = source.type === "PDF / Manuel" ? FileText : source.type === "Teams / Discussion" ? MessageSquare : UserRound;
    return <button className="source-row" key={source.id} onClick={() => onSelect(source)}><span className="source-icon"><Icon size={20} /></span><span><strong>{source.name}</strong><small>{source.type} · {source.locator}</small></span><ArrowUpRight size={17} /></button>;
  })}</div></section>;
}

export function ExpertRecommendation({ expert }: { expert: Knowledge["expert"] }) {
  return <section className="expert-panel"><h3>Votre expert de référence</h3><div className="expert-person"><span className="avatar">{expert.initials}</span><div><strong>{expert.name}</strong><small>{expert.role}</small></div></div><details><summary>Pourquoi cet expert ?<ChevronDown size={15} /></summary><p>{expert.reason}</p><p className="demo-note">Profil fictif. Aucune demande n’est envoyée.</p></details></section>;
}

export function Conflict({ knowledge, onSource }: { knowledge: Knowledge; onSource: (source: Source) => void }) {
  const conflict = knowledge.conflict!;
  return <><span className="conflict-status"><TriangleAlert size={14} />{conflict.status}</span><p>{conflict.explanation}</p><div className="conflict-comparison">{conflict.sourceIds.map((id, index) => {
    const source = knowledge.sources.find(item => item.id === id)!;
    return <section key={id}><span className="small-label">{index === 0 ? "Source officielle du scénario" : "Information contradictoire"}</span><h3>{source.name}</h3><Evidence source={source} /><button className="text-button" onClick={() => onSource(source)}>Voir la provenance<ArrowUpRight size={15} /></button></section>;
  })}</div><ExpertRecommendation expert={knowledge.expert} /></>;
}

export function KnowledgeCard({ knowledge }: { knowledge: Knowledge }) {
  const [source, setSource] = useState<Source | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  return <div className="knowledge-layout"><article className="knowledge-card"><header className="knowledge-header"><div className="card-meta"><span><Fingerprint size={16} />Knowledge Card</span><span>{knowledge.id}</span></div><h1 tabIndex={-1}>{knowledge.title}</h1><p className="knowledge-summary">{knowledge.summary}</p><div className="knowledge-status">{knowledge.conflict ? <><TriangleAlert size={15} />Validation requise</> : <><ShieldCheck size={15} />Sources concordantes dans cette démo</>}</div></header>
    <div className="knowledge-body"><div className="knowledge-accordions"><details open><summary>La règle<ChevronDown size={18} /></summary><p>{knowledge.rule}</p></details><details><summary>Exceptions et points de vigilance<ChevronDown size={18} /></summary><p>{knowledge.exception}</p></details><details><summary>Procédure à suivre<ChevronDown size={18} /></summary><ol>{knowledge.procedure.map(step => <li key={step}>{step}</li>)}</ol></details></div>
    {knowledge.conflict && <section className="conflict-callout"><TriangleAlert size={22} /><div><h3>Un conflit entre les sources</h3><p>{knowledge.conflict.title}</p><button className="text-button" onClick={() => setConflictOpen(true)}>Explorer le conflit<ArrowUpRight size={16} /></button></div><GitCompareArrows className="conflict-decoration" size={32} /></section>}
    <Sources sources={knowledge.sources} onSelect={setSource} />
    <details className="evidence-details"><summary><span><Quote size={17} />Toutes les preuves</span><ChevronDown size={17} /></summary>{knowledge.sources.map(item => <section key={item.id}><h4>{item.name}</h4><Evidence source={item} /></section>)}</details>
    </div><footer className="card-footer">Démonstration · contenu et sources fictifs, sans valeur de conseil métier.</footer></article>
    <aside className="knowledge-aside"><section className="relevance-panel"><div className="relevance-heading"><span>Pertinence contextuelle</span><strong>{knowledge.score}<small>%</small></strong></div><div className="score-track"><span style={{ width: `${knowledge.score}%` }} /></div><details open><summary>Pourquoi cette connaissance ?<ChevronDown size={15} /></summary><ul>{knowledge.reasons.map(reason => <li key={reason}><Check size={15} />{reason}</li>)}</ul></details><p className="demo-note">Score de démonstration, non calculé. Il ne mesure pas la fiabilité de la règle.</p></section>
    <section className="context-panel"><h3>Contexte d’application</h3><dl>{Object.entries(knowledge.context).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section><ExpertRecommendation expert={knowledge.expert} /></aside>
    {source && <DetailDialog title={source.name} onClose={() => setSource(null)}><SourceDetails source={source} /></DetailDialog>}
    {conflictOpen && !source && <DetailDialog title={knowledge.conflict!.title} onClose={() => setConflictOpen(false)}><Conflict knowledge={knowledge} onSource={item => { setConflictOpen(false); setSource(item); }} /></DetailDialog>}
  </div>;
}
