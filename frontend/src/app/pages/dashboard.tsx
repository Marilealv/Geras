import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut, Users, Home as HomeIcon } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Footer } from "../components/footer";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, hydrateAuthSessionFromToken, logoutFromServer } from "../lib/auth";
import { DashboardContent } from "./dashboard/content";

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

    setVinculosPendentes((prev: VinculoPendenteItem[]) =>
      prev.filter((v: VinculoPendenteItem) => v.id !== vinculoId)
    );
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

        <DashboardContent
          instituicao={instituicao}
          editedInstituicao={editedInstituicao}
          setEditedInstituicao={setEditedInstituicao}
          isEditingInstituicao={isEditingInstituicao}
          onEditInstituicao={handleEditInstituicao}
          onSaveInstituicao={handleSaveInstituicao}
          onCancelEditInstituicao={handleCancelEditInstituicao}
          vinculosPendentes={vinculosPendentes}
          handleAprovarVinculo={handleAprovarVinculo}
          canCadastrarIdoso={canCadastrarIdoso}
          idosos={idosos}
          showSuccessModal={showSuccessModal}
          onCloseSuccessModal={() => setShowSuccessModal(false)}
        />
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