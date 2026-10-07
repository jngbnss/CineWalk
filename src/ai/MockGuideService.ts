import type { GuideService, WorldLookup } from './GuideService';

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Offline, keyword-driven guide grounded in each world's POI data. */
export class MockGuideService implements GuideService {
  readonly name = 'Mock guide';

  constructor(private readonly lookup: WorldLookup, private readonly latencyMs: [number, number] = [250, 650]) {}

  async ask(worldId: string, poiId: string | null, question: string): Promise<string> {
    await delay(this.latencyMs[0] + Math.random() * (this.latencyMs[1] - this.latencyMs[0]));
    const world = this.lookup(worldId);
    if (!world) return "I'm not sure where we are — try entering a world first.";
    const poi = world.pois.find((p) => p.id === poiId) ?? null;
    const q = question.toLowerCase().trim();

    if (/^(hi|hello|hey|안녕)/.test(q))
      return `Welcome to the ${world.name}! ${poi ? `You're at the ${poi.name}. ` : ''}Ask me about anything you see.`;

    if (/(\bnext\b|\bgo\b|recommend|suggest|visit|where should|다음|추천)/.test(q)) {
      const others = world.pois.filter((p) => p.id !== poiId);
      const target = pick(others);
      return `Try the ${target.name} next — ${target.description.charAt(0).toLowerCase()}${target.description.slice(1)} Look for the gold markers on your minimap.`;
    }

    if (/(portal|travel|leave|other world|teleport|포털)/.test(q)) {
      const portal = world.portals[0];
      return portal
        ? `There's a glowing portal on the grounds — walk into it to travel to the ${portal.label}. It's the pulsing ring on your minimap.`
        : 'There are no portals here yet.';
    }

    if (!poi) {
      return `${world.summary} Walk up to one of the glowing gold markers and I can tell you more about it.`;
    }

    if (/(story|history|legend|secret|rumou?r|이야기)/.test(q)) return poi.story ?? `Every corner of the ${poi.name} has a story — this one is still being written.`;

    if (/(fact|detail|more|tell me|how|why|정보)/.test(q) && poi.facts?.length) return pick(poi.facts);

    const fact = poi.facts?.length ? ` ${pick(poi.facts)}` : '';
    return `This is the ${poi.name}. ${poi.description}${fact}`;
  }
}
