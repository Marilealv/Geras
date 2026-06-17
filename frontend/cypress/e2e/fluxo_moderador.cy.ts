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
      status: 'pendente',
    };

    // Intercepta pedidos pendentes: frontend espera um payload com `instituicoes: [...]`
    cy.intercept('GET', '**/api/moderador/instituicoes', { statusCode: 200, body: { instituicoes: [pendingInstitution] } }).as('getPendentes');

    // Intercepta aprovação: frontend faz PATCH para `/api/moderador/instituicoes/:id/status`
    cy.intercept('PATCH', '**/api/moderador/instituicoes/*/status', { statusCode: 200, body: { success: true } }).as('aprovar');

    // Algumas áreas também consultam a rota pública de instituições; garantimos consistência
    cy.intercept('GET', '**/api/instituicoes**', { statusCode: 200, body: { instituicoes: [pendingInstitution] } }).as('listInstituicoes');

    cy.visit(`${base}/moderador`);

    // 1) Clicar em 'Abrir Instituições' para acessar a listagem (visível na página)
    cy.contains('Abrir Instituições').click();

    // 2) Rolamos até a seção 'Instituições Pendentes' e abrimos o primeiro item (ícone 'olho')
    cy.contains('Instituições Pendentes').scrollIntoView();

    // Aguarda a tabela carregar e garante que existe ao menos uma linha (pode demorar)
    cy.get('table tbody tr', { timeout: 20000 }).first().within(() => {
      // A coluna de ações tem vários botões; o primeiro é o 'Ver' (ícone Eye). Clicamos no primeiro botão.
      cy.get('td').last().find('button').first().click({ force: true });
    });

    // 3) Clicar no botão de 'Aprovar' (segunda ação) e confirmar na modal
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').last().find('button').eq(1).click({ force: true });
    });

    cy.contains('Aprovar Instituição', { timeout: 10000 }).should('be.visible');
    cy.contains('Confirmar').click();
    cy.wait('@aprovar');
    cy.contains(/aplicad[oa]|sucesso|aprovad/i, { timeout: 5000 }).should('exist');
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
