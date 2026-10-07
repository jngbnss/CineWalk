import type { GuideService, WorldLookup } from './GuideService';
import { MockGuideService } from './MockGuideService';
import { OpenAICompatibleGuideService } from './OpenAICompatibleGuideService';

/** Falls back to the mock guide whenever the real provider fails. */
class FallbackGuideService implements GuideService {
  constructor(private readonly primary: GuideService, private readonly fallback: GuideService) {}

  get name(): string {
    return this.primary.name;
  }

  async ask(worldId: string, poiId: string | null, question: string): Promise<string> {
    try {
      return await this.primary.ask(worldId, poiId, question);
    } catch (err) {
      console.warn('[Guide] provider failed, using mock', err);
      return this.fallback.ask(worldId, poiId, question);
    }
  }
}

/** Picks the guide implementation from Vite env vars (see .env.example). */
export function createGuideService(lookup: WorldLookup): GuideService {
  const env = import.meta.env;
  const mock = new MockGuideService(lookup);
  if (env.VITE_GUIDE_PROVIDER === 'openai' && env.VITE_GUIDE_BASE_URL) {
    const llm = new OpenAICompatibleGuideService(lookup, {
      baseUrl: env.VITE_GUIDE_BASE_URL,
      model: env.VITE_GUIDE_MODEL || 'llama3.2',
      apiKey: env.VITE_GUIDE_API_KEY || undefined,
    });
    return new FallbackGuideService(llm, mock);
  }
  return mock;
}
