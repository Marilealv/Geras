/**
 * Módulo de Autenticação
 * 
 * Gerencia persistência de tokens JWT e dados do usuário no localStorage.
 * O token é enviado em todas as requisições autenticadas via header Authorization.
 */

// Chaves para armazenamento no localStorage
export const AUTH_TOKEN_KEY = "authToken";
export const AUTH_USER_KEY = "user";

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
