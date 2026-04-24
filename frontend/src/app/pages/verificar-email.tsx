import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { getApiUrl } from "../config/api";

export function VerificarEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const verifyEmail = async () => {
      if (!token) {
        if (!cancelled) {
          setErrorMessage("Token de verificacao invalido.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(getApiUrl("/api/auth/email-verification/confirm"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setErrorMessage(data.message || "Nao foi possivel verificar o e-mail.");
          }
          return;
        }

        if (!cancelled) {
          setSuccessMessage(data.message || "E-mail verificado com sucesso.");
          setTimeout(() => navigate("/login", { replace: true }), 1400);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Erro de conexao com o servidor.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
        <Link to="/">
          <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
        </Link>

        <h1 className="text-3xl text-teal-900">Verificacao de E-mail</h1>

        {isLoading && <p className="text-teal-700 mt-4">Validando seu e-mail...</p>}

        {successMessage && <p className="text-green-700 mt-4">{successMessage}</p>}

        {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}

        <Button onClick={() => navigate("/login")} className="w-full mt-6 bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
          Ir para Login
        </Button>
      </div>
    </div>
  );
}
