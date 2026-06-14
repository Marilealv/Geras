import { genEmail, clearAuthLocalStorage } from '../support/utils';

describe('Visão Doador e Privacidade - Geras', () => {
  const base = 'https://geras-front.onrender.com';

  beforeEach(() => {
    cy.viewport(1280, 800);
    clearAuthLocalStorage();
  });

  it('Doador anônimo visualiza lista e perfil do idoso sem dados sensíveis', () => {
    const institution = {
      id: 10,
      nome: 'Casa do Bem',
      cnpj: '98.765.432/0001-00',
      idosos: [{ id: 101, nome: 'Maria', historia: 'Viveu...' , necessidades: ['Fraldas'] }],
    };

    // Intercepta lista pública de instituições e perfil do idoso (padrão mais amplo)
    cy.intercept('GET', '**/api/instituicoes*', { statusCode: 200, body: [institution] }).as('listaPublica');
    cy.intercept('GET', `**/api/instituicoes/*`, { statusCode: 200, body: institution }).as('perfilInst');

    cy.visit(`${base}/instituicoes`);
    cy.wait('@listaPublica', { timeout: 10000 });

    // Clicar no card da instituição
    cy.contains(institution.nome).click();
    cy.wait('@perfilInst', { timeout: 10000 });

    // Verifica campos públicos
    cy.contains(institution.nome).should('be.visible');
    cy.contains(institution.cnpj).should('be.visible');
    cy.contains('Maria').should('be.visible');
    cy.contains('Fraldas').should('be.visible');

    // Garantir que CPF e contato pessoal NÃO aparecem
    cy.contains(/cpf/i).should('not.exist');
    cy.contains(/contato pessoal|telefone pessoal|celular/i).should('not.exist');
  });

  it('Acesso não autenticado a rota privada deve redirecionar/retornar 401', () => {
    // Intercepta requisição direta à API privada e retorna 401 (padrão mais amplo)
    cy.intercept('GET', '**/api/instituicoes/me*', { statusCode: 401, body: { message: 'Acesso negado' } }).as('privateMe');

    // Faz a navegação direta para a rota protegida do front (simula tentativa de acessar painel)
    cy.visit(`${base}/instituicoes/me`, { failOnStatusCode: false });
    cy.wait('@privateMe', { timeout: 10000 });

    // Deve redirecionar para login ou mostrar acesso negado
    cy.url().should('include', '/login');
    cy.contains(/Acesso negado|login/i).should('exist');
  });
});
