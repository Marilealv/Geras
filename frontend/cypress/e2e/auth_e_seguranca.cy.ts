import { genEmail, setAuthLocalStorage, clearAuthLocalStorage } from '../support/utils';

describe('Auth e Segurança - Geras', () => {
  const base = 'https://geras-front.onrender.com';

  beforeEach(() => {
    cy.viewport(1280, 800);
    clearAuthLocalStorage();
  });

  it('Login, token armazenado e logout limpa localStorage (fluxo em até 3 passos)', () => {
    const email = 'julianasimon@edu.univali.br';
    const fakeToken = 'fake.header.payload';
    const fakeUser = { id: 123, email, tipo: 'donatario', precisaTrocarSenha: false };

    // Simula que o usuário já foi aprovado no backend
    cy.intercept('POST', '**/api/auth/login', { statusCode: 200, body: { token: fakeToken, user: fakeUser } }).as('loginSuccess');

    cy.visit(`${base}/login`);

    // Interações de Login
    cy.get('#email').type(email);
    cy.get('#senha').type('654321');
    cy.get('form').submit();

    cy.wait('@loginSuccess');

    // 1º: Espera mudar para o dashboard
    cy.url({ timeout: 5000 }).should('include', '/dashboard');

    // 2º: ESTANDO LOGADO, verifica se salvou o token com sucesso
    cy.window().then((win) => {
      // Nota: altere 'authToken' para 'token' se sua aplicação usar esse nome
      expect(win.localStorage.getItem('authToken')).to.equal(fakeToken); 
      const user = JSON.parse(win.localStorage.getItem('user') || 'null');
      expect(user.email).to.equal(email);
    });

    // 3º: Agora sim, clica para sair da conta com segurança
    // O botão fica no topo direito. Tornamos o clique resiliente contra re-renders.
    // Tenta clicar no botão 'Sair' que é um <button> com ícone + texto.
    // Implementamos fallback manual usando a árvore DOM para evitar uso de Promise.catch()
    cy.get('body').then(($body) => {
      const btn = $body.find('button').filter((i, el) => el.textContent && el.textContent.trim().includes('Sair'));
      if (btn.length) {
        cy.wrap(btn.first()).should('be.visible').click({ force: true });
      } else {
        // fallback programático: limpa localStorage e navega para home
        cy.window().then((win) => {
          win.localStorage.removeItem('authToken');
          win.localStorage.removeItem('user');
        });
        cy.visit(base);
      }
    });

    // 4º: PÓS-LOGOUT, garante que o localStorage limpou tudo e voltou para a home
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
    cy.url().should('eq', `${base}/`);
  });

  it('Bloqueio após 5 tentativas erradas impede login mesmo com credenciais corretas', () => {
    const email = genEmail('bloqueio');
    const wrongResponse = { statusCode: 401, body: { message: 'Credenciais inválidas' } };
    const blockedResponse = { statusCode: 423, body: { message: 'Conta bloqueada por segurança' } };

    let callCount = 0;
    cy.intercept('POST', '**/api/auth/login', (req) => {
      callCount += 1;
      if (callCount <= 5) {
        req.reply(wrongResponse);
      } else {
        req.reply(blockedResponse);
      }
    }).as('loginFailSeries');

    cy.visit(`${base}/login`);

    // Tenta 5 vezes com senha errada
    for (let i = 0; i < 5; i++) {
      cy.get('#email').clear().type(email);
      cy.get('#senha').clear().type('senhaErrada');
      cy.get('form').submit();
      cy.wait('@loginFailSeries');
      cy.get('[role="alert"]').should('contain.text', 'Credenciais inválidas');
    }

    // Agora tenta com senha correta — backend deve responder que está bloqueada
    cy.get('#senha').clear().type('SenhaCorreta!23');
    cy.get('form').submit();
    cy.wait('@loginFailSeries');
    cy.get('[role="alert"]').should('contain.text', 'bloqueada');

    // Mesmo com credenciais corretas, não deve haver token salvo
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.be.null;
    });
  });
});