import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, LogOut, Users, Home as HomeIcon, Heart, Edit, Save } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Footer } from "../components/footer";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, hydrateAuthSessionFromToken, logoutFromServer } from "../lib/auth";

interface Idoso {
  id: number;
  nome: string;
  idade: number;
  foto?: string;
  historia?: string;
}

interface Instituicao {
  nomeInstituicao: string;
  id?: number;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  descricao: string;
  motivoRecusa?: string | null;
  status?: string;
}

interface VinculoInstituicao {
  status: "pendente" | "aprovado" | "rejeitado";
  motivo_rejeicao?: string | null;
  instituicao?: {
    id: number;
    nome: string;
    cnpj: string;
  };
}

interface VinculoPendenteItem {
  id: number;
  usuario_id: number;
  nome_responsavel: string;
  email: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [idosos, setIdosos] = useState<Idoso[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [instituicao, setInstituicao] = useState<Instituicao | null>(null);
  const [vinculoInstituicao, setVinculoInstituicao] = useState<VinculoInstituicao | null>(null);
  const [isEditingInstituicao, setIsEditingInstituicao] = useState(false);
  const [editedInstituicao, setEditedInstituicao] = useState<Instituicao | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [vinculosPendentes, setVinculosPendentes] = useState<VinculoPendenteItem[]>([]);

  useEffect(() => {
    hydrateAuthSessionFromToken();

    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser?.precisaTrocarSenha) {
      navigate("/trocar-senha", { replace: true });
      return;
    }

    setUser(parsedUser);

    const loadDashboardData = async () => {
      try {
        const [instituicaoResponse, idososResponse] = await Promise.all([
          fetch(getApiUrl("/api/instituicoes/me"), {
            headers: {
              ...getAuthHeaders(),
            },
          }),
          fetch(getApiUrl("/api/idosos"), {
            headers: {
              ...getAuthHeaders(),
            },
          }),
        ]);

        if (instituicaoResponse.status === 401 || idososResponse.status === 401) {
          clearAuthSession();
          navigate("/login");
          return;
        }

        const instituicaoData = await instituicaoResponse.json();
        const idososData = await idososResponse.json();

        setVinculoInstituicao(instituicaoData.vinculo || null);

        if (instituicaoData.instituicao) {
          const mappedInstituicao = {
            id: instituicaoData.instituicao.id,
            nomeInstituicao: instituicaoData.instituicao.nome,
            cnpj: instituicaoData.instituicao.cnpj,
            endereco: instituicaoData.instituicao.endereco,
            cidade: instituicaoData.instituicao.cidade,
            estado: instituicaoData.instituicao.estado,
            cep: instituicaoData.instituicao.cep,
            telefone: instituicaoData.instituicao.telefone,
            descricao: instituicaoData.instituicao.descricao,
            motivoRecusa: instituicaoData.instituicao.motivo_recusa,
            status: instituicaoData.instituicao.status,
          };

          setInstituicao(mappedInstituicao);
          setEditedInstituicao(mappedInstituicao);
          localStorage.setItem("instituicao", JSON.stringify(mappedInstituicao));

          const vinculosResponse = await fetch(
            getApiUrl(`/api/instituicoes/${instituicaoData.instituicao.id}/vinculos-pendentes`),
            {
              headers: {
                ...getAuthHeaders(),
              },
            }
          );

          if (vinculosResponse.ok) {
            const vinculosData = await vinculosResponse.json();
            setVinculosPendentes(vinculosData.vinculos || []);
          }
        }

        const mappedIdosos = (idososData.idosos || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          idade: item.idade,
          foto: item.foto_url,
          historia: item.historia,
        }));

        setIdosos(mappedIdosos);
        localStorage.setItem("idosos", JSON.stringify(mappedIdosos));
      } catch {
        // fallback para dados locais quando API estiver indisponivel
        const idososData = localStorage.getItem("idosos");
        if (idososData) {
          setIdosos(JSON.parse(idososData));
        }

        const instituicaoData = localStorage.getItem("instituicao");
        if (instituicaoData) {
          const inst = JSON.parse(instituicaoData);
          setInstituicao(inst);
          setEditedInstituicao(inst);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    await logoutFromServer();
    navigate("/");
  };

  const handleEditInstituicao = () => {
    setIsEditingInstituicao(true);
  };

  const handleSaveInstituicao = async () => {
    if (editedInstituicao) {
      try {
        await fetch(getApiUrl("/api/instituicoes/me"), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            nome: editedInstituicao.nomeInstituicao,
            cnpj: editedInstituicao.cnpj,
            endereco: editedInstituicao.endereco,
            cidade: editedInstituicao.cidade,
            estado: editedInstituicao.estado,
            cep: editedInstituicao.cep,
            telefone: editedInstituicao.telefone,
            descricao: editedInstituicao.descricao,
          }),
        });
      } catch {
        // em caso de falha de rede, persiste localmente
      }

      localStorage.setItem("instituicao", JSON.stringify(editedInstituicao));
      setInstituicao(editedInstituicao);
      setIsEditingInstituicao(false);
      setShowSuccessModal(true);
    }
  };

  const handleCancelEditInstituicao = () => {
    setEditedInstituicao(instituicao);
    setIsEditingInstituicao(false);
  };

  const handleAprovarVinculo = async (vinculoId: number, action: "aprovar" | "recusar") => {
    if (!instituicao?.id) return;

    let motivoRejeicao: string | null = null;

    if (action === "recusar") {
      motivoRejeicao = window.prompt("Informe o motivo da rejeição:") || null;
      if (!motivoRejeicao) return;
    }

    await fetch(getApiUrl(`/api/instituicoes/${instituicao.id}/vinculos/${vinculoId}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ action, motivoRejeicao }),
    });

    setVinculosPendentes((prev) => prev.filter((v) => v.id !== vinculoId));
  };

  const instituicaoStatus = String(instituicao?.status || "").toLowerCase();
  const isInstituicaoAprovada = ["aprovada", "ativa"].includes(instituicaoStatus);
  const vinculoStatus = String(vinculoInstituicao?.status || "").toLowerCase();
  const shouldBlockDashboard = Boolean(
    (instituicao && !isInstituicaoAprovada) ||
      (!instituicao && (vinculoStatus === "pendente" || vinculoStatus === "rejeitado"))
  );

  const canCadastrarIdoso = instituicao ? isInstituicaoAprovada : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
          <p className="text-xl text-teal-900">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (shouldBlockDashboard) {
    const isPendente = instituicao ? instituicaoStatus === "pendente" : vinculoStatus === "pendente";

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex flex-col">
        <header className="bg-white/80 backdrop-blur-sm border-b border-teal-100 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/">
                <img src={logoGeras} alt="Geras" className="h-12" />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-teal-900 hidden sm:inline">
                Olá, {user?.nome || user?.email}
              </span>
              <Button
                variant="outline"
                className="border-teal-700 text-teal-900 hover:bg-teal-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-10 flex-1">
          <Card className="border-yellow-200 bg-yellow-50 max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-yellow-900">
                {isPendente ? "Cadastro em análise" : "Cadastro da instituição indisponível"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-900 mb-6">
                {isPendente
                  ? "Seu cadastro/vinculo de instituição ainda está em análise. Assim que for aprovado, o dashboard será liberado."
                  : "Seu cadastro/vinculo de instituição foi recusado ou desativado. Entre em contato com o moderador para regularizar o acesso."}
              </p>
              {!isPendente && (instituicao?.motivoRecusa || vinculoInstituicao?.motivo_rejeicao) && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-900 mb-1">Motivo informado pelo moderador</p>
                  <p className="text-red-900 whitespace-pre-wrap">{instituicao?.motivoRecusa || vinculoInstituicao?.motivo_rejeicao}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link to="/instituicoes">
                  <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                    Ver instituições
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-teal-700 text-teal-900 hover:bg-teal-50"
                >
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    );
  }

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
          <div className="flex items-center gap-4">
            <span className="text-teal-900 hidden sm:inline">
              Olá, {user?.nome || user?.email}
            </span>
            <Button
              variant="outline"
              className="border-teal-700 text-teal-900 hover:bg-teal-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-teal-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-900">
                Total de Idosos
              </CardTitle>
              <Users className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-900">{idosos.length}</div>
            </CardContent>
          </Card>

          <Card className="border-teal-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-900">
                Instituição
              </CardTitle>
              <HomeIcon className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg text-teal-900">
                {instituicao?.nomeInstituicao || "Não cadastrada"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dados da Instituição */}
        {instituicao && (
          <Card className="border-teal-200 mb-8">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-teal-900 flex items-center gap-2">
                  <HomeIcon className="w-6 h-6" />
                  Dados da Instituição
                </CardTitle>
                {!isEditingInstituicao && (
                  <Button
                    onClick={handleEditInstituicao}
                    variant="outline"
                    className="border-teal-700 text-teal-900 hover:bg-teal-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Nome da Instituição
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.nomeInstituicao || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, nomeInstituicao: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.nomeInstituicao}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    CNPJ
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.cnpj || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, cnpj: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.cnpj}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Endereço
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.endereco || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, endereco: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.endereco}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Telefone
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.telefone || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, telefone: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.telefone}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Cidade
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.cidade || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, cidade: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.cidade}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Estado
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.estado || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, estado: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.estado}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    CEP
                  </label>
                  {isEditingInstituicao ? (
                    <Input
                      value={editedInstituicao?.cep || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, cep: e.target.value } : null
                        )
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.cep}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-teal-700 font-medium mb-1 block">
                    Descrição
                  </label>
                  {isEditingInstituicao ? (
                    <textarea
                      value={editedInstituicao?.descricao || ""}
                      onChange={(e) =>
                        setEditedInstituicao((prev) =>
                          prev ? { ...prev, descricao: e.target.value } : null
                        )
                      }
                      className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px]"
                    />
                  ) : (
                    <p className="text-teal-900">{instituicao.descricao}</p>
                  )}
                </div>
              </div>

              {isEditingInstituicao && (
                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={handleSaveInstituicao}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </Button>
                  <Button
                    onClick={handleCancelEditInstituicao}
                    variant="outline"
                    className="border-teal-300 text-teal-900 hover:bg-teal-50"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {instituicao && vinculosPendentes.length > 0 && (
          <Card className="border-teal-200 mb-8">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
              <CardTitle className="text-2xl text-teal-900">Solicitações de vínculo pendentes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {vinculosPendentes.map((vinculo) => (
                <div key={vinculo.id} className="rounded-lg border border-teal-100 p-4 flex flex-wrap gap-3 justify-between items-center">
                  <div>
                    <p className="text-teal-900 font-medium">{vinculo.nome_responsavel}</p>
                    <p className="text-sm text-teal-700">{vinculo.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAprovarVinculo(vinculo.id, "aprovar")}>Aprovar</Button>
                    <Button className="bg-[#E88080] hover:bg-red-600 text-white" onClick={() => handleAprovarVinculo(vinculo.id, "recusar")}>Recusar</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!instituicao && (
          <div className="mb-8">
            <Card className="border-teal-200">
              <CardContent className="py-12 text-center">
                <HomeIcon className="w-16 h-16 mx-auto text-teal-300 mb-4" />
                <h3 className="text-2xl text-teal-900 mb-4">
                  Cadastre sua Instituição
                </h3>
                <p className="text-lg text-teal-700 mb-6">
                  Antes de cadastrar idosos, é necessário cadastrar sua instituição.
                </p>
                <Link to="/cadastrar-instituicao">
                  <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg px-8">
                    <HomeIcon className="w-5 h-5 mr-2" />
                    Solicitar Cadastro de Instituição
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Idosos */}
        {instituicao && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-2xl text-teal-900 mb-4 sm:mb-0">Idosos Cadastrados</h2>
              {canCadastrarIdoso && (
                <Link to="/cadastrar-idoso">
                  <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Novo Idoso
                  </Button>
                </Link>
              )}
            </div>

            {!canCadastrarIdoso && (
              <Card className="border-yellow-200 bg-yellow-50 mb-6">
                <CardContent className="py-4">
                  <p className="text-yellow-800">
                    Sua instituição ainda não foi aprovada. O cadastro de idosos será liberado após aprovação do moderador.
                  </p>
                </CardContent>
              </Card>
            )}

            {idosos.length === 0 ? (
              <Card className="border-teal-200">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-teal-300 mb-4" />
                  <p className="text-lg text-teal-700 mb-4">
                    Ainda não há idosos cadastrados
                  </p>
                  {canCadastrarIdoso && (
                    <Link to="/cadastrar-idoso">
                      <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
                        <Plus className="w-4 h-4 mr-2" />
                        Cadastrar Primeiro Idoso
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {idosos.map((idoso) => (
                  <Link key={idoso.id} to={`/perfil-idoso/${idoso.id}`}>
                    <Card className="border-teal-200 hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          {idoso.foto ? (
                            <img
                              src={idoso.foto}
                              alt={idoso.nome}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                              <Users className="w-8 h-8 text-teal-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg text-teal-900">{idoso.nome}</h3>
                            <p className="text-teal-600">{idoso.idade} anos</p>
                          </div>
                        </div>
                        {idoso.historia && (
                          <p className="text-sm text-teal-700 line-clamp-3">
                            {idoso.historia}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl text-teal-900 mb-4">Sucesso!</h3>
            <p className="text-sm text-teal-700 mb-6">
              As informações da instituição foram atualizadas com sucesso.
            </p>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}