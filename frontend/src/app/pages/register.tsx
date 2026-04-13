import { useState } from "react";
import { Link, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getApiUrl } from "../config/api";
import { setAuthSession } from "../lib/auth";

interface InstituicaoBusca {
  id: number;
  nome: string;
  cnpj: string;
  cidade: string;
  estado: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [jaCadastrada, setJaCadastrada] = useState(false);
  const [buscaInstituicao, setBuscaInstituicao] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<InstituicaoBusca[]>([]);
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState<InstituicaoBusca | null>(null);
  const [formData, setFormData] = useState({
    nomeResponsavel: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.senha !== formData.confirmarSenha) {
      setErrorMessage("As senhas nao coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      if (jaCadastrada && !instituicaoSelecionada) {
        setErrorMessage("Selecione uma instituição já cadastrada para solicitar vínculo.");
        return;
      }

      const response = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          senha: formData.senha,
          tipo: "donatario",
          nomeResponsavel: formData.nomeResponsavel,
          telefone: formData.telefone,
          instituicaoIdExistente: jaCadastrada ? instituicaoSelecionada?.id : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Nao foi possivel concluir o cadastro.");
        return;
      }

      setAuthSession(data.token, data.user);

      navigate(jaCadastrada ? "/dashboard" : "/cadastrar-instituicao");
    } catch {
      setErrorMessage("Erro de conexao com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuscarInstituicoes = async () => {
    const query = buscaInstituicao.trim();

    if (query.length < 2) {
      setResultadosBusca([]);
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/instituicoes/search?query=${encodeURIComponent(query)}`));
      const payload = await response.json();
      setResultadosBusca(payload.instituicoes || []);
    } catch {
      setResultadosBusca([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl text-teal-900">Cadastro de Donatário</h1>
          <p className="text-teal-700 mt-2">
            Cadastre sua instituição ou solicite vínculo com uma instituição já cadastrada
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-teal-900 font-medium mb-3">Sua instituição já está cadastrada?</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-teal-900">
                  <input
                    type="radio"
                    name="jaCadastrada"
                    checked={!jaCadastrada}
                    onChange={() => {
                      setJaCadastrada(false);
                      setInstituicaoSelecionada(null);
                    }}
                  />
                  Não, vou cadastrar agora
                </label>
                <label className="flex items-center gap-2 text-teal-900">
                  <input
                    type="radio"
                    name="jaCadastrada"
                    checked={jaCadastrada}
                    onChange={() => setJaCadastrada(true)}
                  />
                  Sim, quero solicitar vínculo
                </label>
              </div>
            </div>

            {jaCadastrada && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="buscaInstituicao" className="text-teal-900">
                    Buscar instituição por nome ou CNPJ
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="buscaInstituicao"
                      type="text"
                      value={buscaInstituicao}
                      onChange={(e) => setBuscaInstituicao(e.target.value)}
                      placeholder="Digite nome ou CNPJ"
                      className="border-teal-200 focus:border-teal-500"
                    />
                    <Button type="button" onClick={handleBuscarInstituicoes} className="bg-teal-700 hover:bg-teal-800 text-white">
                      Buscar
                    </Button>
                  </div>
                </div>

                {resultadosBusca.length > 0 && (
                  <div className="rounded-lg border border-teal-200 divide-y divide-teal-100">
                    {resultadosBusca.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setInstituicaoSelecionada(item)}
                        className={`w-full text-left px-4 py-3 hover:bg-teal-50 ${instituicaoSelecionada?.id === item.id ? "bg-teal-100" : "bg-white"}`}
                      >
                        <p className="text-teal-900 font-medium">{item.nome}</p>
                        <p className="text-sm text-teal-700">{item.cnpj} • {item.cidade}/{item.estado}</p>
                      </button>
                    ))}
                  </div>
                )}

                {instituicaoSelecionada && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-900">
                    Instituição selecionada: {instituicaoSelecionada.nome}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="nomeResponsavel" className="text-teal-900">
                Nome do Responsável
              </Label>
              <Input
                id="nomeResponsavel"
                name="nomeResponsavel"
                type="text"
                value={formData.nomeResponsavel}
                onChange={handleChange}
                placeholder="João Silva"
                className="mt-2 border-teal-200 focus:border-teal-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-teal-900">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contato@instituicao.com.br"
                className="mt-2 border-teal-200 focus:border-teal-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone" className="text-teal-900">
                Telefone
              </Label>
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(47) 99999-9999"
                className="mt-2 border-teal-200 focus:border-teal-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="senha" className="text-teal-900">
                Senha
              </Label>
              <Input
                id="senha"
                name="senha"
                type="password"
                value={formData.senha}
                onChange={handleChange}
                placeholder="••••••••"
                className="mt-2 border-teal-200 focus:border-teal-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmarSenha" className="text-teal-900">
                Confirmar Senha
              </Label>
              <Input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                value={formData.confirmarSenha}
                onChange={handleChange}
                placeholder="••••••••"
                className="mt-2 border-teal-200 focus:border-teal-500"
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
            >
              {isLoading ? "Cadastrando..." : jaCadastrada ? "Finalizar e Solicitar Vinculo" : "Proximo: Cadastrar Instituicao"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link to="/login" className="text-teal-700 hover:text-teal-900">
              Já possui conta? Entrar
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-teal-700 hover:text-teal-900">
            ← Voltar para página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}