// Helpers úteis para testes Cypress (TypeScript)
export function genEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}@example.com`;
}

export function setAuthLocalStorage(token: string, user: unknown) {
  cy.window().then((win) => {
    win.localStorage.setItem('authToken', token);
    win.localStorage.setItem('user', JSON.stringify(user));
  });
}

export function clearAuthLocalStorage() {
  cy.window().then((win) => {
    win.localStorage.removeItem('authToken');
    win.localStorage.removeItem('user');
  });
}
