"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, FlaskConical, Layers3, Route, ShieldCheck } from "lucide-react";
import { defaultRefinements, profiles, projectKnowledge, type Intent } from "@/lib/compass-data";
import { Welcome } from "./welcome";
import { Refinement } from "./refinement";
import { KnowledgeCard } from "./knowledge-card";
import "./compass.css";

export function CompassApp() {
  const [profileId, setProfileId] = useState(profiles[0].id);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const profile = profiles.find(item => item.id === profileId)!;
  const knowledge = intent && step === 2 ? projectKnowledge(intent, values) : null;

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    mainRef.current?.querySelector<HTMLElement>("h1")?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, profileId]);

  function selectIntent(next: Intent) {
    setIntent(next); setValues(defaultRefinements(next)); setStep(1);
  }

  return <div className="compass-app"><a href="#main-content" className="skip-link">Aller au contenu</a><aside className="sidebar"><button className="brand" onClick={() => setStep(0)} aria-label="Knowledge Compass, accueil"><span className="brand-icon"><Compass size={25} /></span><span>knowledge<strong>compass<span>.</span></strong></span></button><div className="workspace-label">Espace collaborateur</div><nav aria-label="Navigation principale"><button className="nav-item active" onClick={() => setStep(0)}><Compass size={19} />Explorer<span className="nav-dot" /></button></nav><div className="sidebar-path"><span>Votre parcours</span><ol>{["Votre contexte", "Votre intention", "La connaissance"].map((label, index) => <li key={label} className={index <= step ? "path-active" : ""}><span>{index < step ? <Check size={12} /> : index + 1}</span>{label}</li>)}</ol></div><div className="sidebar-bottom"><div className="sidebar-promise"><ShieldCheck size={23} /><p>Une connaissance utile.<br />Des sources visibles.</p></div><div className="partner-brand">sd<span> worx</span><small>Knowledge, connected.</small></div></div></aside>
    <div className="app-workspace"><header className="topbar"><div className="topbar-title"><Layers3 size={17} /><span>Knowledge Compass</span><span className="topbar-divider">/</span><span className="muted">Explorer</span></div><div className="profile-summary"><span className="profile-text"><strong>{profile.name}</strong><small>{profile.role}</small></span><span className="avatar">{profile.initials}</span></div></header>
    <main id="main-content" ref={mainRef} className="main-content"><div className="journey-bar"><nav aria-label="Étapes du parcours"><button onClick={() => setStep(0)} aria-current={step === 0 ? "step" : undefined}>Explorer</button><span>/</span><button disabled={!intent} onClick={() => setStep(1)} aria-current={step === 1 ? "step" : undefined}>Affiner</button><span>/</span><span aria-current={step === 2 ? "step" : undefined}>Connaissance</span></nav><span className="private-context"><ShieldCheck size={14} />Personnalisé pour vous</span></div>
      {step > 0 && <button className="back-button" onClick={() => setStep(step - 1)}><ArrowLeft size={16} />{step === 1 ? "Toutes les intentions" : "Modifier l’affinage"}</button>}
      {step === 0 && <Welcome profile={profile} onSelect={selectIntent} />}
      {step === 1 && intent && <Refinement intent={intent} profile={profile} values={values} onChange={(id, value) => setValues(previous => ({ ...previous, [id]: value }))} onSubmit={() => setStep(2)} />}
      {step === 2 && (knowledge ? <KnowledgeCard key={`${profileId}-${intent?.id}-${JSON.stringify(values)}`} knowledge={knowledge} /> : <section className="empty-state"><Route size={36} /><h1 tabIndex={-1}>Aucune connaissance pour cette sélection</h1><p>Les sources de démonstration couvrent uniquement 2026. Modifiez la période pour explorer une connaissance étayée.</p><button className="primary-button" onClick={() => setStep(1)}>Modifier l’affinage<ArrowRight size={16} /></button></section>)}
      <footer className="demo-toolbar"><div><FlaskConical size={16} /><span><strong>Espace de démonstration</strong><span className="demo-toolbar-description"> · Profils et connaissances fictifs</span></span></div><label htmlFor="demo-profile">Simuler le profil<select id="demo-profile" value={profileId} onChange={event => { setProfileId(event.target.value); setIntent(null); setValues({}); setStep(0); }}>{profiles.map(item => <option value={item.id} key={item.id}>{item.name} · {item.countryCode} / {item.domain}</option>)}</select></label></footer>
    </main></div></div>;
}
