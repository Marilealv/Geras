import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, hydrateAuthSessionFromToken } from "../lib/auth";

export function TrocarSenhaPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    hydrateAuthSessionFromToken();

    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      if (!parsedUser?.precisaTrocarSenha) {
        navigate(parsedUser?.tipo === "moderador" ? "/moderador" : "/dashboard", { replace: true });
      }
    } catch {
      clearAuthSession();
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (novaSenha !== confirmarSenha) {
      setErrorMessage("As senhas nao coincidem.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(getApiUrl("/api/auth/me/password"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          currentPassword,
          novaSenha,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel atualizar a senha.");
      }

      const updatedUser = {
        ...payload.usuario,
        precisaTrocarSenha: false,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSuccessMessage("Senha atualizada com sucesso. Redirecionando...");

      window.setTimeout(() => {
        navigate(updatedUser.tipo === "moderador" ? "/moderador" : "/dashboard", { replace: true });
      }, 800);
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao trocar a senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl text-teal-950">Troca obrigatória de senha</h1>
          <p className="text-teal-700 mt-2">Você deve trocar sua senha para continuar usando o sistema.</p>
        </div>

        <Card className="border-teal-100 bg-white/90 shadow-xl backdrop-blur-sm">
          <CardHeader className="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-rose-50">
            <CardTitle className="text-teal-900">Defina uma nova senha</CardTitle>
            <CardDescription className="text-teal-700">
              Informe sua senha atual e escolha uma nova senha para liberar o acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="senhaAtual" className="text-teal-900">
                  Senha atual
                </Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="novaSenha" className="text-teal-900">
                  Nova senha
                </Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmarSenha" className="text-teal-900">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}

              {successMessage && <p className="text-sm text-emerald-700">{successMessage}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    clearAuthSession();
                    navigate("/login", { replace: true });
                  }}
                  className="border-teal-300 text-teal-900 hover:bg-teal-50"
                >
                  Sair
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-teal-700 hover:bg-teal-800 text-white">
                  {isLoading ? "Atualizando..." : "Trocar senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
