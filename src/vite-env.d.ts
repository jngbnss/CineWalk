/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GUIDE_PROVIDER?: 'mock' | 'openai';
  readonly VITE_GUIDE_BASE_URL?: string;
  readonly VITE_GUIDE_MODEL?: string;
  readonly VITE_GUIDE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
