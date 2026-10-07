import type { WorldInfo } from '../worlds/World';

/**
 * The AI guide contract. Swap implementations without touching UI code:
 *   MockGuideService            — offline, rule-based (default)
 *   OpenAICompatibleGuideService — Ollama / llama.cpp / vLLM / OpenAI
 * Future: add streaming (`askStream`) and voice (whisper.cpp in, Piper out).
 */
export interface GuideService {
  readonly name: string;
  ask(worldId: string, poiId: string | null, question: string): Promise<string>;
}

/** Resolves the static description of a world (from the registry). */
export type WorldLookup = (worldId: string) => WorldInfo | undefined;

/** Builds the grounding text both the mock and LLM guides use. */
export function describeContext(world: WorldInfo, poiId: string | null): string {
  const poi = world.pois.find((p) => p.id === poiId);
  const lines = [`World: ${world.name}. ${world.summary}`, `Places here: ${world.pois.map((p) => p.name).join(', ')}.`];
  if (poi) {
    lines.push(`The visitor is standing at: ${poi.name} — ${poi.description}`);
    if (poi.facts?.length) lines.push(`Facts: ${poi.facts.join(' ')}`);
    if (poi.story) lines.push(`Story: ${poi.story}`);
  } else {
    lines.push('The visitor is not at any particular point of interest.');
  }
  return lines.join('\n');
}
