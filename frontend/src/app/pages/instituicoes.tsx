import { useState, useEffect } from "react";
import { Link } from "react-router";
import { MapPin, Phone, Users, Heart } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Footer } from "../components/footer";
import { getApiUrl } from "../config/api";
import { getAuthToken, hydrateAuthSessionFromToken } from "../lib/auth";

interface Idoso {
  id: string;
  nome: string;
  idade: number;
  dataAniversario?: string;
  foto?: string;
  historia?: string;
}

interface Instituicao {
  id: string;
  nomeInstituicao: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  descricao: string;
  imagem_url?: string;
  idosos: Idoso[];
  idososAmostra?: Idoso[]; // 3 idosos aleatórios
}

interface HeaderUser {
  tipo: "moderador" | "donatario";
}

export function InstituicoesPage() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [headerUser, setHeaderUser] = useState<HeaderUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para selecionar 3 idosos aleatórios
  const selecionarIdososAleatorios = (idosos: Idoso[]): Idoso[] => {
    if (idosos.length <= 3) return idosos;
    
    const shuffled = [...idosos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const calculateAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;

    const [year, month, day] = String(birthDate)
      .split("T")[0]
      .split("-")
      .map((value) => Number(value));

    if (!year || !month || !day) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() + 1 - month;

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age -= 1;
    }

    return age;
  };

  const enrichMissingBirthDates = async (items: Instituicao[]): Promise<Instituicao[]> => {
    const missingBirthDateIds = items
      .flatMap((inst) => inst.idosos)
      .filter((idoso) => !idoso.dataAniversario)
      .map((idoso) => idoso.id);

    if (!missingBirthDateIds.length) {
      return items;
    }

    const uniqueIds = Array.from(new Set(missingBirthDateIds));
    const birthDatesById = new Map<string, string>();

    await Promise.all(
      uniqueIds.map(async (idosoId) => {
        try {
          const response = await fetch(getApiUrl(`/api/idosos/${idosoId}`));
          if (!response.ok) return;

          const payload = await response.json();
          const dataAniversario = payload?.idoso?.data_aniversario;

          if (dataAniversario) {
            birthDatesById.set(String(idosoId), String(dataAniversario));
          }
        } catch {
          // Mantem fallback para idade retornada na listagem publica
        }
      })
    );

    if (!birthDatesById.size) {
      return items;
    }

    return items.map((inst) => ({
      ...inst,
      idosos: inst.idosos.map((idoso) => ({
        ...idoso,
        dataAniversario: idoso.dataAniversario || birthDatesById.get(idoso.id),
      })),
    }));
  };

  useEffect(() => {
    hydrateAuthSessionFromToken();

    const token = getAuthToken();
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser?.tipo === "moderador" || parsedUser?.tipo === "donatario") {
          setHeaderUser({ tipo: parsedUser.tipo });
        }
      } catch {
        setHeaderUser(null);
      }
    }

    const loadPublicInstituicoes = async () => {
      try {
        const response = await fetch(getApiUrl("/api/instituicoes/publicas"));
        const payload = await response.json();

        if (!response.ok) {
          setInstituicoes([]);
          return;
        }

        const mappedInstituicoes: Instituicao[] = (payload.instituicoes || []).map((inst: any) => {
          const idososMapeados = (inst.idosos || []).map((idoso: any) => ({
            id: String(idoso.id),
            nome: idoso.nome,
            idade: idoso.idade,
            dataAniversario: idoso.data_aniversario || undefined,
            foto: idoso.foto_url,
            historia: idoso.historia,
          }));
          
          return {
            id: String(inst.id),
            nomeInstituicao: inst.nome,
            cnpj: inst.cnpj,
            endereco: inst.endereco,
            cidade: inst.cidade,
            estado: inst.estado,
            cep: inst.cep,
            telefone: inst.telefone,
            descricao: inst.descricao,
            imagem_url: inst.logo_url || inst.imagem_url,
            idosos: idososMapeados,
            idososAmostra: selecionarIdososAleatorios(idososMapeados),
          };
        });

        const enrichedInstituicoes = await enrichMissingBirthDates(mappedInstituicoes);
        setInstituicoes(enrichedInstituicoes);
      } catch {
        setInstituicoes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPublicInstituicoes();
  }, []);

  const quickAccessPath = headerUser?.tipo === "moderador" ? "/moderador" : "/dashboard";
  const quickAccessLabel = headerUser?.tipo === "moderador" ? "Moderador" : "Minha instituição";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-teal-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src={logoGeras} alt="Geras" className="h-12" />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/#inicio" className="text-teal-900 hover:text-teal-700 transition">
              Início
            </Link>
            <Link to="/#sobre" className="text-teal-900 hover:text-teal-700 transition">
              Sobre
            </Link>
            <Link to="/instituicoes" className="text-teal-900 hover:text-teal-700 transition font-medium">
              Instituições
            </Link>
          </nav>
          {headerUser ? (
            <Link to={quickAccessPath}>
              <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                {quickAccessLabel}
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                Entrar
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl mb-4">Instituições Cadastradas</h1>
          <p className="text-xl text-teal-100 max-w-2xl mx-auto">
            Conheça as instituições parceiras e os idosos que precisam de carinho e atenção
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="flex-grow container mx-auto px-4 py-12">
        {isLoading ? (
          <Card className="border-teal-200 max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
              <p className="text-teal-700">Carregando instituições...</p>
            </CardContent>
          </Card>
        ) : instituicoes.length === 0 ? (
          <Card className="border-teal-200 max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto text-teal-300 mb-4" />
              <h2 className="text-2xl text-teal-900 mb-4">
                Ainda não há instituições cadastradas
              </h2>
              <p className="text-teal-700 mb-6">
                Seja a primeira instituição a se cadastrar e começar a receber doações!
              </p>
              <Link to="/registro">
                <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                  Cadastrar Instituição
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {instituicoes.map((instituicao) => (
              <Card key={instituicao.id} className="border-teal-200 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    {instituicao.imagem_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={instituicao.imagem_url}
                          alt={instituicao.nomeInstituicao}
                          className="w-24 h-24 rounded-full object-cover border-2 border-teal-100"
                        />
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg font-semibold text-teal-900 mb-1">
                        {instituicao.nomeInstituicao}
                      </h3>
                      <p className="text-xs text-teal-600 mb-1">{instituicao.cidade} - {instituicao.estado}</p>
                      <p className="text-sm text-teal-700 line-clamp-2 mb-2">{instituicao.descricao}</p>
                      <div className="flex items-center gap-3 text-xs text-teal-600 mb-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{instituicao.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{instituicao.idosos.length} idosos</span>
                        </div>
                      </div>
                      <Link to={`/instituicoes/${instituicao.id}`}>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white text-xs py-1 px-4 h-8">
                          Ver Instituição
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}