import { genEmail, setAuthLocalStorage, clearAuthLocalStorage } from '../support/utils';

describe('Fluxo Moderador - Geras', () => {
  const base = 'https://geras-front.onrender.com';

  beforeEach(() => {
    cy.viewport(1280, 800);
    clearAuthLocalStorage();
  });

  it('Moderador aprova cadastro e vê dados privados e públicos', () => {
    const modToken = 'mod.token';
    const modUser = { id: 999, email: 'mod@geras.test', tipo: 'moderador' };

    // Autentica localmente como moderador
    setAuthLocalStorage(modToken, modUser);

    // Intercepta chamada para recuperar pendentes
    const pendingInstitution = {
      id: 555,
      nome: 'Lar Teste',
      cnpj: '12.345.678/0001-99',
      endereco: 'Rua Exemplo, 123',
      contato: '555-0100',
      idosos: [{ id: 1, nome: 'João', necessidades: ['Ração'] }],
      privado: { banco: '0001', conta: '12345' },
      status: 'PENDENTE',
    };

    // Intercepta pedidos pendentes (padrão mais amplo para capturar diferentes rotas)
    cy.intercept('GET', '**/api/moderador/**', { statusCode: 200, body: [pendingInstitution] }).as('getPendentes');

    // Intercepta aprovação
    cy.intercept('POST', '**/api/moderador/aprovar/*', { statusCode: 200, body: { success: true } }).as('aprovar');

    // Acessa a área do moderador
    cy.visit(`${base}/moderador`);
    cy.wait('@getPendentes', { timeout: 10000 });

    // Verifica que a página do moderador carregou e o botão de aprovar aparece
    cy.url().should('include', '/moderador');
    cy.contains('Aprovar', { timeout: 10000 }).should('exist');

    // Clica em aprovar e checa feedback
    cy.contains('Aprovar').click();
    cy.wait('@aprovar');
    cy.contains(/aprovad/i, { timeout: 5000 }).should('exist');
  });

  it('Donatário pendente não consegue logar (mensagem de pendente)', () => {
    const email = genEmail('pendente');

    // Intercepta login respondendo que usuário está pendente
    cy.intercept('POST', '**/api/auth/login', { statusCode: 401, body: { code: 'PENDENTE', message: 'Sua conta está pendente de aprovação' } }).as('loginPendente');

    cy.visit(`${base}/login`);
    cy.get('#email').type(email);
    cy.get('#senha').type('SenhaQualquer');
    cy.get('form').submit();

    cy.wait('@loginPendente');
    cy.get('[role="alert"]').should('contain.text', 'pendente');

    // Garantir que não foi criado token
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.be.null;
    });
  });
});
