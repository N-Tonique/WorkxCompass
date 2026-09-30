import assert from "node:assert/strict";
import { defaultRefinements, intents, profiles, projectKnowledge } from "../src/lib/compass-data.ts";

for (const profile of profiles) {
  for (const id of profile.intentIds) {
    const intent = intents.find(item => item.id === id);
    assert.ok(intent);
    const values = defaultRefinements(intent);
    const card = projectKnowledge(intent, values);
    assert.equal(card.context.Pays, profile.countryCode);
    assert.equal(card.context.Domaine, intent.domain);
    assert.ok(card.sources.length >= 2);
    assert.ok(card.sources.every(source => source.excerpt && source.origin));
    assert.equal(projectKnowledge(intent, {}), null);
    if (values.period) assert.equal(projectKnowledge(intent, { ...values, period: "2025" }), null);
    if (card.conflict) assert.ok(card.conflict.sourceIds.every(sourceId => card.sources.some(source => source.id === sourceId)));
  }
}
const overtime = intents.find(intent => intent.id === "overtime");
const values = defaultRefinements(overtime);
const saturday = projectKnowledge(overtime, values);
const sunday = projectKnowledge(overtime, { ...values, day: "Dimanche" });
assert.ok(saturday.conflict);
assert.equal(sunday.conflict, undefined);
assert.equal(sunday.sources.length, 2);
assert.notEqual(saturday.rule, sunday.rule);
assert.ok(projectKnowledge(overtime, values).conflict, "Projection must not mutate the shared fixture");
const bonus = intents.find(intent => intent.id === "bonus");
assert.notEqual(projectKnowledge(bonus, defaultRefinements(bonus)).title, projectKnowledge(bonus, { ...defaultRefinements(bonus), information: "Calcul et versement" }).title);
const departure = intents.find(intent => intent.id === "termination");
assert.notEqual(projectKnowledge(departure, defaultRefinements(departure)).procedure[0], projectKnowledge(departure, { ...defaultRefinements(departure), reason: "Rupture conventionnelle" }).procedure[0]);
console.log("Compass: profiles, refinements, evidence, conflicts and empty states verified.");
