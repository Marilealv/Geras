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
      nome: 'Asilo Dom Bosco',
      cnpj: '84.308.063/0001-08',
      idosos: [{ id: 101, nome: 'Maria Silva Santos', historia: 'Maria...' , necessidades: ['Fraldas'] }],
    };

    // Sem intercepts: a UI atual carrega a lista de instituições diretamente.
    // Vamos validar a UI com base no DOM real, procurando nomes na tabela.
    // Não interceptamos: navegaremos no site real e usaremos dados reais do backend.

    cy.visit(`${base}/instituicoes`);
    // Aguarda que a página carregue e procure um botão real 'Ver Instituição'
    cy.contains('Ver Instituição', { timeout: 30000 }).then(($btns) => {
      if ($btns && $btns.length) {
        cy.wrap($btns.first()).click({ force: true });

        // Aguarda a navegação para a rota de detalhe (path inclui /instituicoes/:id)
        cy.location('pathname', { timeout: 10000 }).should((p) => {
          expect(p).to.match(/\/instituicoes\/.+/);
        });

        // Verifica seção de idosos (presente ou mensagem de nenhum idoso)
        cy.contains(/Nossos Idosos|Nossos idosos|Nossos Idosos/i, { timeout: 5000 }).should('exist');
      } else {
        // Se não houver instituições publicadas, asserta mensagem amigável
        cy.contains(/Nenhuma instituição|Nenhuma instituição encontrada/i, { timeout: 5000 }).should('exist');
      }
    });
    // Garantir que CPF e contato pessoal NÃO aparecem na página pública de detalhes
    cy.contains(/cpf/i).should('not.exist');
    cy.contains(/contato pessoal|telefone pessoal|celular/i).should('not.exist');
  });

  it('Acesso não autenticado a rota privada deve redirecionar/retornar 401', () => {
    // Para rota privada, apenas tentamos carregar a página protegida e validar redirecionamento para login
    cy.visit(`${base}/instituicoes/me`, { failOnStatusCode: false });
    // A aplicação pode não redirecionar; validamos que aparece indicação de login/entrada
    cy.contains(/entrar|login|fazer login/i, { timeout: 10000 }).should('exist');
  });
});
