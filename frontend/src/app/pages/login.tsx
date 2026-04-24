import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getApiUrl } from "../config/api";
import { setAuthSession } from "../lib/auth";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(String((location.state as { email?: string } | null)?.email || ""));
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(
    (location.state as { fromRegister?: boolean } | null)?.fromRegister
      ? "Cadastro realizado. Verifique seu e-mail para liberar o login."
      : ""
  );
  const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    setEmailNaoVerificado(false);

    try {
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_NAO_VERIFICADO") {
          setEmailNaoVerificado(true);
        }
        setErrorMessage(data.message || "Nao foi possivel fazer login.");
        return;
      }

      setAuthSession(data.token, data.user);

      if (data.user.precisaTrocarSenha) {
        navigate("/trocar-senha", { replace: true });
        return;
      }

      if (data.user.tipo === "moderador") {
        navigate("/moderador");
        return;
      }

      navigate("/dashboard");
    } catch {
      setErrorMessage("Erro de conexao com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!email.trim()) {
      setErrorMessage("Informe seu e-mail para reenviar a verificacao.");
      return;
    }

    setIsResendingVerification(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const response = await fetch(getApiUrl("/api/auth/email-verification/resend"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Nao foi possivel reenviar o e-mail de verificacao.");
        return;
      }

      setInfoMessage(data.message || "E-mail de verificacao reenviado.");
    } catch {
      setErrorMessage("Erro de conexao com o servidor.");
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl text-teal-900">Bem-vindo de volta</h1>
          <p className="text-teal-700 mt-2">Entre na sua conta</p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-teal-900">
                Login
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
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
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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

            {infoMessage && (
              <p className="text-sm text-green-700" role="status">
                {infoMessage}
              </p>
            )}

            {emailNaoVerificado && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerificationEmail}
                disabled={isResendingVerification}
                className="w-full border-teal-300 text-teal-900"
              >
                {isResendingVerification ? "Reenviando..." : "Reenviar e-mail de verificacao"}
              </Button>
            )}

            <div className="flex items-center justify-between text-sm">
              <Link to="/esqueci-senha" className="text-teal-700 hover:text-teal-900 underline">
                Esqueci minha senha
              </Link>
              <Link to="/registro" className="text-teal-700 hover:text-teal-900 underline">
                Cadastre-se aqui!
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
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