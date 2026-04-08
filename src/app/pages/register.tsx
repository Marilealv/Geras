import { useState } from "react";
import { Link, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function RegisterPage() {
  const navigate = useNavigate();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.senha !== formData.confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }
    // Simular registro
    localStorage.setItem(
      "user",
      JSON.stringify({
        email: formData.email,
        nome: formData.nomeResponsavel,
        tipo: "donatario",
      })
    );
    navigate("/cadastrar-instituicao");
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
            Cadastre sua instituição para começar a receber doações
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button
              type="submit"
              className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
            >
              Próximo: Cadastrar Instituição
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