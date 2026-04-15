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
  idosos: Idoso[];
}

interface HeaderUser {
  tipo: "moderador" | "donatario";
}

export function InstituicoesPage() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [headerUser, setHeaderUser] = useState<HeaderUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        const mappedInstituicoes: Instituicao[] = (payload.instituicoes || []).map((inst: any) => ({
          id: String(inst.id),
          nomeInstituicao: inst.nome,
          cnpj: inst.cnpj,
          endereco: inst.endereco,
          cidade: inst.cidade,
          estado: inst.estado,
          cep: inst.cep,
          telefone: inst.telefone,
          descricao: inst.descricao,
          idosos: (inst.idosos || []).map((idoso: any) => ({
            id: String(idoso.id),
            nome: idoso.nome,
            idade: idoso.idade,
            foto: idoso.foto_url,
            historia: idoso.historia,
          })),
        }));

        setInstituicoes(mappedInstituicoes);
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
          <div className="space-y-8">
            {instituicoes.map((instituicao) => (
              <Card key={instituicao.id} className="border-teal-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
                  <CardTitle className="text-3xl text-teal-900">
                    {instituicao.nomeInstituicao}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-lg font-medium text-teal-900 mb-4">
                        Sobre a Instituição
                      </h3>
                      <p className="text-teal-800 mb-4">{instituicao.descricao}</p>
                      <div className="text-sm text-teal-700">
                        <p className="font-medium">CNPJ: {instituicao.cnpj}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-teal-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-teal-600 mt-1" />
                          <div>
                            <h4 className="font-medium text-teal-900 mb-1">Endereço</h4>
                            <p className="text-teal-700">{instituicao.endereco}</p>
                            <p className="text-teal-700">
                              {instituicao.cidade} - {instituicao.estado}
                            </p>
                            <p className="text-teal-700">CEP: {instituicao.cep}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-teal-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-teal-600 mt-1" />
                          <div>
                            <h4 className="font-medium text-teal-900 mb-1">Contato</h4>
                            <p className="text-teal-700">{instituicao.telefone}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="w-8 h-8 text-teal-600" />
                      <h2 className="text-3xl text-teal-900">
                        Nossos Idosos ({instituicao.idosos.length})
                      </h2>
                    </div>

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
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {instituicao.idosos.map((idoso) => (
                          <Link key={idoso.id} to={`/perfil-idoso/${idoso.id}`}>
                            <Card className="border-teal-200 hover:shadow-xl transition-all cursor-pointer h-full">
                              <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center">
                                  {idoso.foto ? (
                                    <img
                                      src={idoso.foto}
                                      alt={idoso.nome}
                                      className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-teal-100"
                                    />
                                  ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-rose-100 flex items-center justify-center mb-4 border-4 border-teal-100">
                                      <Users className="w-12 h-12 text-teal-600" />
                                    </div>
                                  )}
                                  <h3 className="text-xl text-teal-900 mb-1">{idoso.nome}</h3>
                                  <p className="text-teal-600 mb-3">{idoso.idade} anos</p>
                                  {idoso.historia && (
                                    <p className="text-sm text-teal-700 line-clamp-3">
                                      {idoso.historia}
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
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