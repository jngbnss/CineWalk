import { describeContext, type GuideService, type WorldLookup } from './GuideService';

export interface OpenAICompatibleOptions {
  /** e.g. http://localhost:11434 for Ollama, https://api.openai.com for OpenAI. */
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Talks to any `/v1/chat/completions` endpoint (Ollama, llama.cpp server, vLLM,
 * LM Studio, OpenAI…). Disabled by default — enable with VITE_GUIDE_PROVIDER=openai.
 * Never ship a secret API key to browsers in production; proxy it server-side.
 */
export class OpenAICompatibleGuideService implements GuideService {
  readonly name: string;

  constructor(private readonly lookup: WorldLookup, private readonly opts: OpenAICompatibleOptions) {
    this.name = `${opts.model} @ ${new URL(opts.baseUrl).host}`;
  }

  async ask(worldId: string, poiId: string | null, question: string): Promise<string> {
    const world = this.lookup(worldId);
    const system =
      'You are a warm, concise tour guide inside a fictional 3D world. Answer in 1–3 sentences, ' +
      "in the visitor's language, using only the context below. Never claim the places are real film sets.\n\n" +
      (world ? describeContext(world, poiId) : 'Unknown world.');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 20000);
    try {
      const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.opts.model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: question },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content?.trim() || '…';
    } finally {
      clearTimeout(timer);
    }
  }
}
