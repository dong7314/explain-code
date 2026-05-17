import { buildApiUrl, runtimeConfig } from "../config/runtime";

export type ApiRequestOptions = RequestInit & {
  authToken?: string;
};

export class ApiError extends Error {
  body: unknown;
  status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const getStoredAuthToken = () =>
  window.localStorage.getItem(runtimeConfig.authTokenStorageKey);

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 204) return undefined;
  if (contentType.includes("application/json")) return response.json();

  return response.text();
};

export const apiRequest = async <ResponseBody>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody> => {
  const { authToken = getStoredAuthToken(), headers, ...requestInit } = options;
  const requestHeaders = new Headers(headers);

  if (authToken && !requestHeaders.has("authorization")) {
    requestHeaders.set("authorization", `Bearer ${authToken}`);
  }

  if (requestInit.body && !(requestInit.body instanceof FormData) && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...requestInit,
    headers: requestHeaders,
  });
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(response.statusText || "API request failed", response.status, responseBody);
  }

  return responseBody as ResponseBody;
};
