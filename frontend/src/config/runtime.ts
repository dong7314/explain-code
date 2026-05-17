export type RuntimeConfig = {
  apiBaseUrl: string;
  appEnv: string;
  authStateStorageKey: string;
  authTokenStorageKey: string;
};

type RuntimeConfigInput = Partial<RuntimeConfig>;

declare global {
  interface Window {
    __EXPLAIN_CODE_CONFIG__?: RuntimeConfigInput;
  }
}

const defaultRuntimeConfig: RuntimeConfig = {
  apiBaseUrl: "/api",
  appEnv: "local",
  authStateStorageKey: "explain-code-logged-in",
  authTokenStorageKey: "explain-code-auth-token",
};

const pickString = (value: string | undefined, fallback: string) => {
  const nextValue = value?.trim();
  return nextValue ? nextValue : fallback;
};

const normalizeBaseUrl = (value: string | undefined) => {
  const baseUrl = pickString(value, defaultRuntimeConfig.apiBaseUrl);
  if (baseUrl === "/") return "";
  return baseUrl.replace(/\/+$/, "");
};

const browserConfig = window.__EXPLAIN_CODE_CONFIG__ ?? {};

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: normalizeBaseUrl(browserConfig.apiBaseUrl),
  appEnv: pickString(browserConfig.appEnv, defaultRuntimeConfig.appEnv),
  authStateStorageKey: pickString(
    browserConfig.authStateStorageKey,
    defaultRuntimeConfig.authStateStorageKey,
  ),
  authTokenStorageKey: pickString(
    browserConfig.authTokenStorageKey,
    defaultRuntimeConfig.authTokenStorageKey,
  ),
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${runtimeConfig.apiBaseUrl}${normalizedPath}`;
};
