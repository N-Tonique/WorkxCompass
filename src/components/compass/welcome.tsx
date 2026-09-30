import { ArrowUpRight, Banknote, Clock3, Gift, Globe2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { intents, type Intent, type Profile } from "@/lib/compass-data";

const icons = { bonus: Gift, payroll: Banknote, time: Clock3, termination: LogOut };

export function Context({ profile, domain = profile.domain }: { profile: Profile; domain?: string }) {
  return <div className="context-pills"><span><Globe2 size={14} />{profile.country}</span><span>{domain}</span><span className="automatic"><ShieldCheck size={14} />Contexte automatique</span></div>;
}

export function Intentions({ profile, onSelect }: { profile: Profile; onSelect: (intent: Intent) => void }) {
  return <div className="intent-grid">{profile.intentIds.map(id => {
    const intent = intents.find(item => item.id === id)!;
    const Icon = icons[intent.icon];
    return <button className="intent-card" key={id} onClick={() => onSelect(intent)}>
      <div className="intent-top"><span className="intent-icon"><Icon size={25} strokeWidth={1.6} /></span><span className="domain-label">{intent.domain}</span></div>
      <h3>{intent.title}</h3><p>{intent.description}</p>
      <div className="intent-bottom"><span>Explorer les connaissances</span><ArrowUpRight size={19} /></div>
    </button>;
  })}</div>;
}

export function Welcome({ profile, onSelect }: { profile: Profile; onSelect: (intent: Intent) => void }) {
  return <>
    <section className="welcome-hero">
      <div><div className="welcome-note"><span className="status-dot" />Votre espace de connaissance</div>
        <h1 tabIndex={-1}>Bonjour {profile.name.split(" ")[0]}<span className="hello-dot">.</span></h1>
        <p className="hero-description">La bonne connaissance.<br />Dans votre contexte.</p>
        <Context profile={profile} />
      </div>
      <div className="compass-art" aria-hidden="true"><div className="orbit orbit-outer" /><div className="orbit orbit-inner" /><span className="compass-n">N</span><span className="compass-e">E</span><span className="compass-s">S</span><span className="compass-w">W</span><div className="compass-needle" /><div className="compass-center" /><span className="orbit-point point-one" /><span className="orbit-point point-two" /></div>
    </section>
    <section className="intent-section" aria-labelledby="intent-heading"><div className="section-heading"><div><h2 id="intent-heading">Que souhaitez-vous consulter ?</h2><p>Choisissez une intention. Votre contexte fait le reste.</p></div><span className="quiet-label">Adapté à votre profil</span></div><Intentions profile={profile} onSelect={onSelect} /></section>
    <section className="trust-strip"><span className="trust-icon"><Sparkles size={21} /></span><div><h3>Comprendre, pas seulement consulter.</h3><p>Chaque connaissance relie votre contexte à ses sources, ses preuves et ses éventuels conflits.</p></div><span className="trace-label"><ShieldCheck size={16} />La traçabilité, par défaut</span></section>
  </>;
}
