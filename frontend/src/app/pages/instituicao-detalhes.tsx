import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { MapPin, Phone, Users, Heart, ArrowLeft, Building2 } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Footer } from "../components/footer";
import { getApiUrl } from "../config/api";

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
}

export function InstituicaoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerUser, setHeaderUser] = useState<{ tipo: "moderador" | "donatario" } | null>(null);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        setHeaderUser(null);
        return;
      }

      const parsed = JSON.parse(userData);
      if (parsed?.tipo === "moderador" || parsed?.tipo === "donatario") {
        setHeaderUser({ tipo: parsed.tipo });
      } else {
        setHeaderUser(null);
      }
    } catch {
      setHeaderUser(null);
    }
  }, []);

  const quickAccessPath = headerUser?.tipo === "moderador" ? "/moderador" : "/dashboard";
  const quickAccessLabel = headerUser?.tipo === "moderador" ? "Moderador" : "Minha instituição";
  const btnTransition = "transition-all duration-300";
  const quickAccessStateClass = headerUser ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none";
  const loginStateClass = headerUser ? "opacity-0 -translate-x-4 pointer-events-none" : "opacity-100 translate-x-0";

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

  useEffect(() => {
    const loadInstituicaoDetails = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/instituicoes/publicas/${id}`));

        if (!response.ok) {
          setError("Instituição não encontrada");
          setInstituicao(null);
          return;
        }

        const payload = await response.json();
        const inst = payload.instituicao;

        const mappedInstituicao: Instituicao = {
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
          idosos: (inst.idosos || []).map((idoso: any) => ({
            id: String(idoso.id),
            nome: idoso.nome,
            idade: idoso.idade,
            dataAniversario: idoso.data_aniversario || undefined,
            foto: idoso.foto_url,
            historia: idoso.historia,
          })),
        };

        setInstituicao(mappedInstituicao);
        setError(null);
      } catch (err) {
        setError("Erro ao carregar instituição");
        setInstituicao(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInstituicaoDetails();
  }, [id]);

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
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/instituicoes">
              <Button
                variant="outline"
                className={`border-teal-700 text-teal-900 hover:bg-teal-50 ${btnTransition}`}
              >
                <ArrowLeft className="w-4 h-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>

            <Link to={quickAccessPath} className={`${btnTransition} ${quickAccessStateClass}`}>
              <Button
                variant="outline"
                className={`border-teal-700 text-teal-900 hover:bg-teal-50 ${btnTransition} ${quickAccessStateClass}`}
              >
                <Building2 className="w-4 h-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">{quickAccessLabel}</span>
              </Button>
            </Link>

            <Link to="/login" className={`${btnTransition} ${loginStateClass}`}>
              <Button className={`bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 ${btnTransition} ${loginStateClass}`}>
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow container mx-auto px-4 py-12">
        {isLoading ? (
          <Card className="border-teal-200">
            <CardContent className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
              <p className="text-teal-700">Carregando instituição...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-teal-200">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto text-teal-300 mb-4" />
              <h2 className="text-2xl text-teal-900 mb-4">
                {error}
              </h2>
              <Link to="/instituicoes">
                <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                  Voltar para Instituições
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : instituicao ? (
          <Card className="border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
              <CardTitle className="text-4xl text-teal-900">
                {instituicao.nomeInstituicao}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar - Imagem e Info Principal */}
                <div className="lg:col-span-1">
                  {instituicao.imagem_url && (
                    <div className="mb-6">
                      <img
                        src={instituicao.imagem_url}
                        alt={instituicao.nomeInstituicao}
                        className="w-full rounded-lg object-cover border-2 border-teal-100 mb-4"
                      />
                    </div>
                  )}
                  
                  <div className="bg-teal-50 rounded-lg p-4 space-y-3 sticky top-20">
                    <div>
                      <h4 className="font-medium text-teal-900 mb-2 text-sm">Contato</h4>
                      <p className="text-teal-700 text-sm flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {instituicao.telefone}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-teal-900 mb-2 text-sm">Localização</h4>
                      <p className="text-teal-700 text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{instituicao.cidade} - {instituicao.estado}</span>
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-teal-900 mb-1 text-sm">CNPJ</h4>
                      <p className="text-teal-700 text-xs">{instituicao.cnpj}</p>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                  <div className="mb-8">
                    <h3 className="text-xl font-medium text-teal-900 mb-3">Sobre a Instituição</h3>
                    <p className="text-teal-800 leading-relaxed">{instituicao.descricao}</p>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-4 mb-8">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-teal-600 font-medium">Endereço</p>
                        <p className="text-teal-800">{instituicao.endereco}</p>
                        <p className="text-teal-800">{instituicao.cep}</p>
                      </div>
                      <div>
                        <p className="text-teal-600 font-medium">Total de Idosos</p>
                        <p className="text-2xl font-bold text-teal-700">{instituicao.idosos.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Idosos */}
                  <div>
                    <h2 className="text-2xl font-semibold text-teal-900 mb-4">
                      Nossos Idosos
                    </h2>

                    {instituicao.idosos.length === 0 ? (
                      <Card className="border-teal-200">
                        <CardContent className="py-12 text-center">
                          <Users className="w-16 h-16 mx-auto text-teal-300 mb-4" />
                          <p className="text-lg text-teal-700">
                            Ainda não há idosos cadastrados nesta instituição
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {instituicao.idosos.map((idoso) => {
                          const calculatedAge = calculateAge(idoso.dataAniversario);
                          const displayedAge = calculatedAge ?? idoso.idade;

                          return (
                            <Link key={idoso.id} to={`/perfil-idoso/${idoso.id}`}>
                              <Card className="border-teal-200 hover:shadow-lg transition-all cursor-pointer h-full">
                                <CardContent className="p-4">
                                  <div className="flex flex-col items-center text-center">
                                    {idoso.foto ? (
                                      <img
                                        src={idoso.foto}
                                        alt={idoso.nome}
                                        className="w-20 h-20 rounded-full object-cover mb-3 border-3 border-teal-100"
                                      />
                                    ) : (
                                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-rose-100 flex items-center justify-center mb-3 border-3 border-teal-100">
                                        <Users className="w-10 h-10 text-teal-600" />
                                      </div>
                                    )}
                                    <h3 className="text-lg font-medium text-teal-900">{idoso.nome}</h3>
                                    <p className="text-sm text-teal-600 mb-2">{displayedAge} anos</p>
                                    {idoso.historia && (
                                      <p className="text-xs text-teal-700 line-clamp-2">
                                        {idoso.historia}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
