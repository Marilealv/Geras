const envApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = envApiUrl ? envApiUrl.replace(/\/$/, "") : "";

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
