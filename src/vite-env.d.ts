/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEET_URL?: string;
  readonly VITE_GOOGLE_SHEET_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_SHEET_NAME?: string;
  readonly VITE_SYNC_POLL_MS?: string;
  readonly VITE_SYNC_WRITE_DEBOUNCE_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
