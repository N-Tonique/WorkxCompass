import { ArrowRight, SlidersHorizontal } from "lucide-react";
import type { Intent, Profile } from "@/lib/compass-data";
import { Context } from "./welcome";

export function Refinement({ intent, profile, values, onChange, onSubmit }: {
  intent: Intent; profile: Profile; values: Record<string, string>;
  onChange: (id: string, value: string) => void; onSubmit: () => void;
}) {
  return <section className="refinement-view"><div className="view-heading"><span className="intent-icon"><SlidersHorizontal size={25} /></span><h1 tabIndex={-1}>{intent.title}</h1><p>Quelques précisions pour vous orienter vers la bonne connaissance.</p><Context profile={profile} domain={intent.domain} /></div>
    <div className="refinement-layout"><form className="refinement-form" onSubmit={event => { event.preventDefault(); onSubmit(); }}><h2>Précisez votre besoin</h2><p>Les options s’adaptent à votre intention métier.</p><div className="field-grid">{intent.fields.map(field => <label key={field.id} htmlFor={field.id}>{field.label}<select id={field.id} value={values[field.id]} onChange={event => onChange(field.id, event.target.value)} required>{field.options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div><button className="primary-button" type="submit">Découvrir la connaissance<ArrowRight size={17} /></button></form>
      <aside className="refinement-aside"><span className="small-label">Votre point de départ</span><h3>Un contexte déjà connu.</h3><p>Votre pays est issu de votre profil. Le domaine et le sujet découlent de l’intention choisie.</p><dl><div><dt>Pays</dt><dd>{profile.country}</dd></div><div><dt>Domaine</dt><dd>{intent.domain}</dd></div><div><dt>Sujet</dt><dd>{intent.topic}</dd></div></dl><span className="demo-note">Données fictives pour la démonstration.</span></aside></div>
  </section>;
}
