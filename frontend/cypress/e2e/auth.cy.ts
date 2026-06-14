describe('Página de Autenticação - Geras', () => {
  const base = 'https://geras-front.onrender.com';
  const apiPattern = '**/api/auth/login';

  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('exibe campos de email e senha e botao entrar', () => {
    cy.visit(`${base}/login`);
    cy.get('#email').should('exist').and('have.attr', 'type', 'email');
    cy.get('#senha').should('exist').and('have.attr', 'type', 'password');
    cy.contains('Entrar').should('exist');
  });

  it('mostra mensagem de erro quando credenciais invalidas', () => {
    // intercepta a requisição de login e responde com 401
    cy.intercept('POST', apiPattern, {
      statusCode: 401,
      body: { message: 'Credenciais inválidas' },
    }).as('postLoginFail');

    cy.visit(`${base}/login`);
    cy.get('#email').type('naoexiste@example.com');
    cy.get('#senha').type('senhaerrada');
    cy.get('form').submit();

    cy.wait('@postLoginFail');
    cy.get('[role="alert"]').should('contain.text', 'Credenciais inválidas');
  });

  it('loga com sucesso e persiste token na localStorage', () => {
    const fakeToken = 'header.payload.signature';
    const fakeUser = { id: 1, email: 'teste@ex.com', tipo: 'donatario' };

    cy.intercept('POST', apiPattern, {
      statusCode: 200,
      body: { token: fakeToken, user: fakeUser },
    }).as('postLoginSuccess');

    cy.visit(`${base}/login`);
    cy.get('#email').clear().type('teste@ex.com');
    cy.get('#senha').clear().type('minhasenha');
    cy.get('form').submit();

    cy.wait('@postLoginSuccess');

    // Verifica que o token foi armazenado
    cy.window().then((win) => {
      const token = win.localStorage.getItem('authToken');
      expect(token).to.equal(fakeToken);
      const user = JSON.parse(win.localStorage.getItem('user') || 'null');
      expect(user).to.deep.equal(fakeUser);
    });

    // Após login o app navega para /dashboard
    cy.url().should('include', '/dashboard');
  });
});
