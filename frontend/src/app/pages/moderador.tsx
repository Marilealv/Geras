import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut, CheckCircle, XCircle, Eye, Trash2, Ban, Building2, RefreshCw, UserCog } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { clearAuthSession } from "../lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

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
  status: "pendente" | "ativa" | "desativada" | "recusada";
  dataCadastro: string;
}

export function ModeradorPage() {
  const navigate = useNavigate();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [selectedInstituicao, setSelectedInstituicao] = useState<Instituicao | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"aprovar" | "recusar" | "desativar" | "excluir" | "reativar">("aprovar");
  const [motivoRecusa, setMotivoRecusa] = useState("");

  useEffect(() => {
    // Verificar se está logado como moderador
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    let parsedUser: { tipo?: string } | null = null;
    try {
      parsedUser = JSON.parse(userData);
    } catch {
      navigate("/login");
      return;
    }

    if (parsedUser?.tipo !== "moderador") {
      navigate("/dashboard");
      return;
    }

    // Carregar instituições (simulado - em produção viria do backend)
    const instituicoesData = localStorage.getItem("todasInstituicoes");
    if (instituicoesData) {
      setInstituicoes(JSON.parse(instituicoesData));
    } else {
      // Dados de exemplo
      const exemplos: Instituicao[] = [
        {
          id: "1",
          nomeInstituicao: "Lar dos Idosos São Francisco",
          cnpj: "12.345.678/0001-90",
          endereco: "Rua das Flores, 123",
          cidade: "Joinville",
          estado: "SC",
          cep: "89201-000",
          telefone: "(47) 3333-4444",
          descricao: "Instituição dedicada ao cuidado de idosos há 20 anos",
          status: "pendente",
          dataCadastro: "2026-03-20",
        },
        {
          id: "2",
          nomeInstituicao: "Casa de Repouso Vida Plena",
          cnpj: "98.765.432/0001-10",
          endereco: "Av. Principal, 456",
          cidade: "Florianópolis",
          estado: "SC",
          cep: "88010-000",
          telefone: "(48) 9999-8888",
          descricao: "Cuidando com amor e dedicação de nossos idosos",
          status: "ativa",
          dataCadastro: "2026-02-15",
        },
      ];
      setInstituicoes(exemplos);
      localStorage.setItem("todasInstituicoes", JSON.stringify(exemplos));
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const instituicoesPendentes = instituicoes.filter((i) => i.status === "pendente");

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: "bg-yellow-100 text-yellow-800",
      ativa: "bg-green-100 text-green-800",
      desativada: "bg-gray-100 text-gray-800",
      recusada: "bg-red-100 text-red-800",
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  const getStatusText = (status: string) => {
    const texts = {
      pendente: "Pendente",
      ativa: "Ativa",
      desativada: "Desativada",
      recusada: "Recusada",
    };
    return texts[status as keyof typeof texts] || "Pendente";
  };

  const handleAction = (instituicao: Instituicao, action: typeof actionType) => {
    setSelectedInstituicao(instituicao);
    setActionType(action);
    setShowActionModal(true);
  };

  const handleAccessAsAdmin = (instituicao: Instituicao) => {
    // Salvar dados da instituição e marcar que é acesso de moderador
    localStorage.setItem("instituicao", JSON.stringify(instituicao));
    localStorage.setItem("moderadorAccess", "true");
    // Redirecionar para o dashboard
    navigate("/dashboard");
  };

  const confirmAction = () => {
    if (!selectedInstituicao) return;

    const updatedInstituicoes = instituicoes.map((inst) => {
      if (inst.id === selectedInstituicao.id) {
        if (actionType === "aprovar" || actionType === "reativar") {
          return { ...inst, status: "ativa" as const };
        } else if (actionType === "recusar") {
          return { ...inst, status: "recusada" as const };
        } else if (actionType === "desativar") {
          return { ...inst, status: "desativada" as const };
        }
      }
      return inst;
    });

    if (actionType === "excluir") {
      const filtered = instituicoes.filter((i) => i.id !== selectedInstituicao.id);
      setInstituicoes(filtered);
      localStorage.setItem("todasInstituicoes", JSON.stringify(filtered));
    } else {
      setInstituicoes(updatedInstituicoes);
      localStorage.setItem("todasInstituicoes", JSON.stringify(updatedInstituicoes));
    }

    setShowActionModal(false);
    setSelectedInstituicao(null);
    setMotivoRecusa("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-teal-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src={logoGeras} alt="Geras" className="h-12 mix-blend-multiply" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-teal-900 font-medium hidden sm:inline">Painel do Moderador</span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-teal-300 text-teal-900 hover:bg-teal-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Instituições Pendentes */}
        <Card className="border-teal-200 mb-8">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
            <CardTitle className="text-2xl text-teal-900 flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Instituições Pendentes ({instituicoesPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {instituicoesPendentes.length === 0 ? (
              <p className="text-center text-teal-700 py-8">
                Nenhuma instituição pendente de aprovação
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-teal-200">
                      <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Instituição</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base hidden md:table-cell">CNPJ</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base hidden lg:table-cell">Cidade/Estado</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Status</th>
                      <th className="text-right py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instituicoesPendentes.map((instituicao) => (
                      <tr key={instituicao.id} className="border-b border-teal-100">
                        <td className="py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">{instituicao.nomeInstituicao}</td>
                        <td className="py-3 px-2 sm:px-4 text-teal-700 text-sm hidden md:table-cell">{instituicao.cnpj}</td>
                        <td className="py-3 px-2 sm:px-4 text-teal-700 text-sm hidden lg:table-cell">
                          {instituicao.cidade}/{instituicao.estado}
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                              instituicao.status
                            )}`}
                          >
                            {getStatusText(instituicao.status)}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-right">
                          <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInstituicao(instituicao);
                                setShowDetailsModal(true);
                              }}
                              className="border-teal-300 text-teal-700 hover:bg-teal-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(instituicao, "aprovar")}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAction(instituicao, "recusar")}
                              className="bg-[#E88080] hover:bg-red-600 text-white"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Todas as Instituições */}
        <Card className="border-teal-200">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
            <CardTitle className="text-2xl text-teal-900 flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Todas as Instituições ({instituicoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-teal-200">
                    <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Instituição</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base hidden md:table-cell">CNPJ</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base hidden lg:table-cell">Cidade/Estado</th>
                    <th className="text-left py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Status</th>
                    <th className="text-right py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {instituicoes.map((instituicao) => (
                    <tr key={instituicao.id} className="border-b border-teal-100">
                      <td className="py-3 px-2 sm:px-4 text-teal-900 text-sm sm:text-base">{instituicao.nomeInstituicao}</td>
                      <td className="py-3 px-2 sm:px-4 text-teal-700 text-sm hidden md:table-cell">{instituicao.cnpj}</td>
                      <td className="py-3 px-2 sm:px-4 text-teal-700 text-sm hidden lg:table-cell">
                        {instituicao.cidade}/{instituicao.estado}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                            instituicao.status
                          )}`}
                        >
                          {getStatusText(instituicao.status)}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-right">
                        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInstituicao(instituicao);
                              setShowDetailsModal(true);
                            }}
                            className="border-teal-300 text-teal-700 hover:bg-teal-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAccessAsAdmin(instituicao)}
                            className="border-teal-300 text-teal-700 hover:bg-teal-50"
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                          {instituicao.status === "ativa" && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(instituicao, "desativar")}
                              className="bg-gray-600 hover:bg-gray-700 text-white"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {instituicao.status === "desativada" && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(instituicao, "reativar")}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleAction(instituicao, "excluir")}
                            className="bg-[#E88080] hover:bg-red-600 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl text-teal-900">Detalhes da Instituição</DialogTitle>
          </DialogHeader>
          {selectedInstituicao && (
            <div className="space-y-4 pr-2">
              <div>
                <h3 className="font-medium text-teal-900 mb-2">Informações Básicas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-teal-50 rounded-lg p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-teal-700">Nome:</p>
                    <p className="text-teal-900 break-words">{selectedInstituicao.nomeInstituicao}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-teal-700">CNPJ:</p>
                    <p className="text-teal-900 break-words">{selectedInstituicao.cnpj}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-teal-700">Telefone:</p>
                    <p className="text-teal-900 break-words">{selectedInstituicao.telefone}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-teal-700">Status:</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                        selectedInstituicao.status
                      )}`}
                    >
                      {getStatusText(selectedInstituicao.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-teal-900 mb-2">Endereço</h3>
                <div className="bg-teal-50 rounded-lg p-4 min-w-0">
                  <p className="text-teal-900 break-words">{selectedInstituicao.endereco}</p>
                  <p className="text-teal-900 break-words">
                    {selectedInstituicao.cidade} - {selectedInstituicao.estado}
                  </p>
                  <p className="text-teal-900 break-words">CEP: {selectedInstituicao.cep}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-teal-900 mb-2">Descrição</h3>
                <div className="bg-teal-50 rounded-lg p-4 min-w-0">
                  <p className="text-teal-900 break-words whitespace-pre-wrap">{selectedInstituicao.descricao}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedInstituicao) handleAccessAsAdmin(selectedInstituicao);
              }}
              className="border-teal-300 text-teal-900 hover:bg-teal-50 w-full sm:w-auto"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Acessar como Admin
            </Button>
            {selectedInstituicao?.status === "pendente" && (
              <>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAction(selectedInstituicao, "aprovar");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                >
                  Aprovar Cadastro
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAction(selectedInstituicao, "recusar");
                  }}
                  className="bg-[#E88080] hover:bg-red-600 text-white w-full sm:w-auto"
                >
                  Recusar Cadastro
                </Button>
              </>
            )}
            {selectedInstituicao?.status === "ativa" && (
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleAction(selectedInstituicao, "desativar");
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white w-full sm:w-auto"
              >
                Desativar Conta
              </Button>
            )}
            {selectedInstituicao?.status === "desativada" && (
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleAction(selectedInstituicao, "reativar");
                }}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                Reativar Conta
              </Button>
            )}
            <Button
              onClick={() => {
                setShowDetailsModal(false);
                if (selectedInstituicao) handleAction(selectedInstituicao, "excluir");
              }}
              className="bg-[#E88080] hover:bg-red-600 text-white w-full sm:w-auto"
            >
              Excluir Conta
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
              className="border-teal-300 text-teal-900 hover:bg-teal-50 w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Ação */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-teal-900">
              {actionType === "aprovar" && "Aprovar Instituição"}
              {actionType === "recusar" && "Recusar Instituição"}
              {actionType === "desativar" && "Desativar Conta"}
              {actionType === "reativar" && "Reativar Conta"}
              {actionType === "excluir" && "Excluir Conta"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "aprovar" &&
                "Tem certeza que deseja aprovar esta instituição? Ela poderá começar a cadastrar idosos."}
              {actionType === "recusar" &&
                "Tem certeza que deseja recusar esta instituição? Informe o motivo abaixo."}
              {actionType === "desativar" &&
                "Tem certeza que deseja desativar esta conta? A instituição não poderá mais acessar o sistema."}
              {actionType === "reativar" &&
                "Tem certeza que deseja reativar esta conta? A instituição voltará a ter acesso ao sistema."}
              {actionType === "excluir" &&
                "Tem certeza que deseja excluir permanentemente esta conta? Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          {actionType === "recusar" && (
            <div className="py-4">
              <label className="text-sm text-teal-900 mb-2 block">Motivo da recusa:</label>
              <textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={3}
                placeholder="Descreva o motivo da recusa..."
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowActionModal(false);
                setMotivoRecusa("");
              }}
              className="border-teal-300 text-teal-900 hover:bg-teal-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              className={
                actionType === "aprovar" || actionType === "reativar"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-[#E88080] hover:bg-red-600 text-white"
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}