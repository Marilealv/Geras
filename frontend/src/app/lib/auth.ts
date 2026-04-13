/**
 * Módulo de Autenticação
 * 
 * Gerencia persistência de tokens JWT e dados do usuário no localStorage.
 * O token é enviado em todas as requisições autenticadas via header Authorization.
 */

import { getApiUrl } from "../config/api";

// Chaves para armazenamento no localStorage
export const AUTH_TOKEN_KEY = "authToken";
export const AUTH_USER_KEY = "user";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadPart] = token.split(".");

    if (!payloadPart) {
      return null;
    }

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Recupera o token JWT armazenado
 * @returns Token JWT ou null se não encontrado
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Armazena token JWT e dados do usuário no localStorage
 * Chamado após login/registro bem-sucedido
 * 
 * @param token - Token JWT de autenticação
 * @param user - Objeto do usuário com id, email, tipo, etc.
 */
export function setAuthSession(token: string, user: unknown): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Remove todos os dados de autenticação do localStorage
 * Chamado no logout
 */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("moderadorAccess");
}

/**
 * Reconstrói sessão local a partir do JWT quando usuário abre rota diretamente.
 * Evita depender do fluxo de login para popular localStorage.user.
 */
export function hydrateAuthSessionFromToken(): void {
  const token = getAuthToken();

  if (!token) {
    return;
  }

  const existingUser = localStorage.getItem(AUTH_USER_KEY);
  if (existingUser) {
    return;
  }

  const payload = decodeJwtPayload(token);

  const userId = Number(payload?.sub);
  const email = typeof payload?.email === "string" ? payload.email : "";
  const tipo = payload?.tipo === "moderador" || payload?.tipo === "donatario" ? payload.tipo : null;

  if (!Number.isFinite(userId) || !email || !tipo) {
    return;
  }

  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      id: userId,
      email,
      tipo,
    })
  );
}

/**
 * Faz logout no backend para revogar o token atual.
 * Sempre limpa a sessao local ao final, mesmo em caso de falha de rede.
 */
export async function logoutFromServer(): Promise<void> {
  const token = getAuthToken();

  try {
    if (token) {
      await fetch(getApiUrl("/api/auth/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Em logout, erros de rede nao devem impedir limpeza local.
  } finally {
    clearAuthSession();
  }
}

/**
 * Constrói headers de autenticação para requisições protegidas
 * @returns Objeto com header Authorization contendo token Bearer
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
