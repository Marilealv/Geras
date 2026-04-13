import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  LogOut,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Ban,
  Building2,
  RefreshCw,
  UserCog,
  ArrowLeft,
  Loader2,
  Shield,
  User,
  Link2,
} from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, hydrateAuthSessionFromToken, logoutFromServer } from "../lib/auth";
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
  motivoRecusa?: string | null;
  status: "pendente" | "ativa" | "desativada" | "recusada";
  dataCadastro: string;
}

interface ModeradorUsuario {
  id: number;
  nome_responsavel: string;
  email: string;
  telefone: string;
  tipo_usuario: "moderador" | "donatario";
  bloqueado: boolean;
  precisa_trocar_senha: boolean;
  instituicoes_aprovadas: string;
  vinculos_pendentes: string;
}

interface ModeradorVinculoUsuario {
  id: number;
  instituicao_id: number;
  instituicao_nome: string;
  instituicao_cnpj: string;
  perfil: string;
  status: "aprovado" | "pendente" | "rejeitado";
  solicitado_em: string;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
}

export function ModeradorPage() {
  const navigate = useNavigate();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [selectedInstituicao, setSelectedInstituicao] = useState<Instituicao | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"aprovar" | "recusar" | "desativar" | "excluir" | "reativar" | "pendenciar">("aprovar");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [activeSection, setActiveSection] = useState<"menu" | "instituicoes" | "usuarios">("menu");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [usuarios, setUsuarios] = useState<ModeradorUsuario[]>([]);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [userActionFeedback, setUserActionFeedback] = useState("");
  const [showUserVinculosModal, setShowUserVinculosModal] = useState(false);
  const [showUserActionsModal, setShowUserActionsModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<ModeradorUsuario | null>(null);
  const [userVinculos, setUserVinculos] = useState<ModeradorVinculoUsuario[]>([]);
  const [isLoadingVinculos, setIsLoadingVinculos] = useState(false);
  const [isUpdatingVinculo, setIsUpdatingVinculo] = useState(false);

  const loadInstituicoes = async () => {
    const response = await fetch(getApiUrl("/api/moderador/instituicoes"), {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (response.status === 401) {
      clearAuthSession();
      navigate("/login");
      return;
    }

    if (response.status === 403) {
      navigate("/dashboard");
      return;
    }

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.message || "Nao foi possivel carregar as instituicoes.");
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
      motivoRecusa: inst.motivo_recusa,
      status: inst.status,
      dataCadastro: inst.data_cadastro,
    }));

    setInstituicoes(mappedInstituicoes);
  };

  const loadUsuarios = async () => {
    const response = await fetch(getApiUrl("/api/moderador/usuarios"), {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload?.message || "Nao foi possivel carregar os usuarios.");
    }

    const payload = await response.json();
    setUsuarios(payload.usuarios || []);
  };

  const handleUserAction = async (userId: number, action: string) => {
    const body: Record<string, unknown> = { action };

    if (action === "trocarSenha") {
      const novaSenha = window.prompt("Digite a nova senha para o usuario:");
      if (!novaSenha) return;
      body.novaSenha = novaSenha;
    }

    try {
      setErrorMessage("");
      setIsUpdatingUser(true);
      setUpdatingUserId(userId);
      setUserActionFeedback("Atualizando...");

      const response = await fetch(getApiUrl(`/api/moderador/usuarios/${userId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel atualizar o usuario.");
      }

      await loadUsuarios();
      setUserActionFeedback("Atualizado com sucesso.");
    } catch (error: any) {
      setUserActionFeedback("");
      setErrorMessage(error?.message || "Erro ao executar acao de usuario.");
    } finally {
      setIsUpdatingUser(false);
      setUpdatingUserId(null);

      window.setTimeout(() => {
        setUserActionFeedback("");
      }, 1800);
    }
  };

  const loadUserVinculos = async (userId: number) => {
    setIsLoadingVinculos(true);
    setErrorMessage("");

    try {
      const response = await fetch(getApiUrl(`/api/moderador/usuarios/${userId}/vinculos`), {
        headers: {
          ...getAuthHeaders(),
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel carregar os vinculos do usuario.");
      }

      setUserVinculos(payload.vinculos || []);
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao carregar vinculos do usuario.");
      setUserVinculos([]);
    } finally {
      setIsLoadingVinculos(false);
    }
  };

  const handleOpenUserVinculos = async (usuario: ModeradorUsuario) => {
    setSelectedUsuario(usuario);
    setShowUserVinculosModal(true);
    await loadUserVinculos(usuario.id);
  };

  const handleOpenUserActions = (usuario: ModeradorUsuario) => {
    setSelectedUsuario(usuario);
    setShowUserActionsModal(true);
  };

  const handleUserVinculoAction = async (
    vinculoId: number,
    action: "aprovar" | "pendenciar" | "rejeitar" | "desvincular"
  ) => {
    if (!selectedUsuario) return;

    try {
      setIsUpdatingVinculo(true);
      setErrorMessage("");

      const response = await fetch(
        getApiUrl(`/api/moderador/usuarios/${selectedUsuario.id}/vinculos/${vinculoId}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok && response.status !== 204) {
        const payload = await response.json();
        throw new Error(payload?.message || "Nao foi possivel atualizar o vinculo.");
      }

      await Promise.all([loadUserVinculos(selectedUsuario.id), loadUsuarios()]);
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao atualizar vinculo do usuario.");
    } finally {
      setIsUpdatingVinculo(false);
    }
  };

  useEffect(() => {
    hydrateAuthSessionFromToken();

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

    const boot = async () => {
      try {
        setErrorMessage("");
        await Promise.all([loadInstituicoes(), loadUsuarios()]);
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao carregar instituicoes.");
      } finally {
        setIsLoading(false);
      }
    };

    boot();
  }, [navigate]);

  const handleLogout = async () => {
    await logoutFromServer();
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

  const getUserRoleLabel = (tipo: ModeradorUsuario["tipo_usuario"]) => {
    return tipo === "moderador" ? "Moderador" : "Donatario";
  };

  const getUserStatusBadge = (usuario: ModeradorUsuario) => {
    if (usuario.bloqueado) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Bloqueado</Badge>;
    }

    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ativo</Badge>;
  };

  const getPasswordBadge = (usuario: ModeradorUsuario) => {
    if (usuario.precisa_trocar_senha) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Troca de senha pendente</Badge>;
    }

    return <Badge className="bg-sky-100 text-sky-700 border-sky-200">Senha definida</Badge>;
  };

  const sectionTitle = {
    menu: "Painel do Moderador",
    usuarios: "Editar Usuários",
    instituicoes: "Verificar Instituições",
  }[activeSection];

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

    const submit = async () => {
      try {
        setIsSubmittingAction(true);
        setErrorMessage("");

        if (actionType === "excluir") {
          const response = await fetch(
            getApiUrl(`/api/moderador/instituicoes/${selectedInstituicao.id}`),
            {
              method: "DELETE",
              headers: {
                ...getAuthHeaders(),
              },
            }
          );

          if (!response.ok && response.status !== 204) {
            const payload = await response.json();
            throw new Error(payload?.message || "Nao foi possivel excluir a instituicao.");
          }
        } else {
          const response = await fetch(
            getApiUrl(`/api/moderador/instituicoes/${selectedInstituicao.id}/status`),
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify({
                action: actionType,
                motivoRecusa: motivoRecusa || null,
              }),
            }
          );

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.message || "Nao foi possivel atualizar a instituicao.");
          }
        }

        await loadInstituicoes();
        setShowActionModal(false);
        setSelectedInstituicao(null);
        setMotivoRecusa("");
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao executar acao de moderacao.");
      } finally {
        setIsSubmittingAction(false);
      }
    };

    submit();
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
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {activeSection !== "menu" && (
              <Button
                variant="outline"
                onClick={() => setActiveSection("menu")}
                className="border-teal-300 text-teal-900 hover:bg-teal-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
            <h1 className="text-2xl sm:text-3xl font-semibold text-teal-950">{sectionTitle}</h1>
          </div>
          {(isUpdatingUser || isSubmittingAction || isUpdatingVinculo) && (
            <div className="flex items-center gap-2 text-sm text-teal-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Atualizando...
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent mb-3"></div>
              <p className="text-teal-900">Carregando painel...</p>
            </div>
          </div>
        )}

        {!isLoading && errorMessage && (
          <Card className="border-red-200 mb-6">
            <CardContent className="py-4">
              <p className="text-red-700">{errorMessage}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && (
          <>
        {activeSection === "menu" && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900">Editar Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 mb-4">Gerencie permissões, bloqueios e senha dos usuários.</p>
                <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setActiveSection("usuarios")}>Abrir Usuários</Button>
              </CardContent>
            </Card>
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900">Verificar Instituições</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 mb-4">Aprove, recuse, desative ou reative instituições.</p>
                <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setActiveSection("instituicoes")}>Abrir Instituições</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "usuarios" && (
          <Card className="border-teal-200 mb-8">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-rose-50">
              <CardTitle className="text-2xl text-teal-900">Gestão de Usuários</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {userActionFeedback && (
                <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                  {userActionFeedback}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-teal-200">
                      <th className="text-left py-3 px-2 text-teal-900">Usuário</th>
                      <th className="text-left py-3 px-2 text-teal-900 hidden md:table-cell">Tipo</th>
                      <th className="text-left py-3 px-2 text-teal-900 hidden lg:table-cell">Situação</th>
                      <th className="text-right py-3 px-2 text-teal-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id} className="border-b border-teal-100 align-top">
                        <td className="py-3 px-2">
                          <p className="text-teal-900 font-medium">{usuario.nome_responsavel}</p>
                          <p className="text-sm text-teal-700">{usuario.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2 lg:hidden">
                            {getUserStatusBadge(usuario)}
                            {getPasswordBadge(usuario)}
                          </div>
                          {isUpdatingUser && updatingUserId === usuario.id && (
                            <div className="mt-2 inline-flex items-center gap-2 text-xs text-teal-700">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Atualizando...
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell text-teal-800">
                          <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                            {getUserRoleLabel(usuario.tipo_usuario)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 hidden lg:table-cell text-teal-800">
                          <div className="flex flex-wrap gap-2">
                            {getUserStatusBadge(usuario)}
                            {getPasswordBadge(usuario)}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-teal-300 text-teal-800 hover:bg-teal-50"
                            disabled={isUpdatingUser}
                            onClick={() => handleOpenUserActions(usuario)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "instituicoes" && (
        <>
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
        </>
        )}
          </>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="w-[96vw] sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-teal-100">
            <DialogTitle className="text-2xl text-teal-900">Detalhes da Instituição</DialogTitle>
          </DialogHeader>
          {selectedInstituicao && (
            <div className="max-h-[68vh] overflow-y-auto px-6 py-4 space-y-4">
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

              {selectedInstituicao.motivoRecusa && selectedInstituicao.status === "recusada" && (
                <div>
                  <h3 className="font-medium text-teal-900 mb-2">Motivo da Recusa</h3>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100 min-w-0">
                    <p className="text-red-900 break-words whitespace-pre-wrap">{selectedInstituicao.motivoRecusa}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t border-teal-100 flex-col sm:flex-row gap-2">
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
            {selectedInstituicao?.status === "recusada" && (
              <>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAction(selectedInstituicao, "pendenciar");
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
                >
                  Voltar para Pendente
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleAction(selectedInstituicao, "aprovar");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                >
                  Aprovar Agora
                </Button>
              </>
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
              {actionType === "pendenciar" && "Voltar para Pendente"}
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
              {actionType === "pendenciar" &&
                "Tem certeza que deseja voltar esta instituição para pendente? Ela voltará para a fila de análise."}
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
              disabled={isSubmittingAction}
              className={
                actionType === "aprovar" || actionType === "reativar" || actionType === "pendenciar"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-[#E88080] hover:bg-red-600 text-white"
              }
            >
              {isSubmittingAction ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUserActionsModal}
        onOpenChange={(open) => {
          setShowUserActionsModal(open);
          if (!open) {
            setSelectedUsuario(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Ações do usuário</DialogTitle>
            <DialogDescription>
              {selectedUsuario
                ? `${selectedUsuario.nome_responsavel} (${selectedUsuario.email})`
                : "Gerencie permissões e acessos do usuário."}
            </DialogDescription>
          </DialogHeader>

          {selectedUsuario && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                onClick={() => {
                  setShowUserActionsModal(false);
                  handleOpenUserVinculos(selectedUsuario);
                }}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Ver/Trocar instituições
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                onClick={() => handleUserAction(selectedUsuario.id, "tornarModerador")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Tornar moderador
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                onClick={() => handleUserAction(selectedUsuario.id, "tornarDonatario")}
              >
                <User className="w-4 h-4 mr-2" />
                Tornar donatario
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                onClick={() => handleUserAction(selectedUsuario.id, selectedUsuario.bloqueado ? "desbloquear" : "bloquear")}
              >
                <Ban className="w-4 h-4 mr-2" />
                {selectedUsuario.bloqueado ? "Desbloquear usuário" : "Bloquear usuário"}
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                onClick={() =>
                  handleUserAction(
                    selectedUsuario.id,
                    selectedUsuario.precisa_trocar_senha ? "removerTrocaSenha" : "forcarTrocaSenha"
                  )
                }
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {selectedUsuario.precisa_trocar_senha ? "Remover troca de senha" : "Forçar troca de senha"}
              </Button>
              <Button
                className="justify-start bg-teal-700 hover:bg-teal-800 text-white"
                onClick={() => handleUserAction(selectedUsuario.id, "trocarSenha")}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Definir nova senha
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-teal-300 text-teal-900 hover:bg-teal-50"
              onClick={() => setShowUserActionsModal(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUserVinculosModal}
        onOpenChange={(open) => {
          setShowUserVinculosModal(open);
          if (!open) {
            setSelectedUsuario(null);
            setUserVinculos([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-teal-900">Instituições vinculadas do usuário</DialogTitle>
            <DialogDescription>
              {selectedUsuario
                ? `${selectedUsuario.nome_responsavel} (${selectedUsuario.email})`
                : "Gerencie os vínculos de instituição deste usuário."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingVinculos ? (
            <div className="py-8 flex items-center justify-center gap-2 text-teal-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando vínculos...
            </div>
          ) : userVinculos.length === 0 ? (
            <div className="py-8 text-center text-teal-700">Nenhum vínculo encontrado para este usuário.</div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
              {userVinculos.map((vinculo) => (
                <div key={vinculo.id} className="rounded-lg border border-teal-200 p-4 bg-white">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-teal-900">{vinculo.instituicao_nome}</p>
                      <p className="text-sm text-teal-700">CNPJ: {vinculo.instituicao_cnpj}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200">Perfil: {vinculo.perfil}</Badge>
                        <Badge className={getStatusBadge(vinculo.status)}>{getStatusText(vinculo.status)}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {vinculo.status !== "aprovado" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={isUpdatingVinculo}
                          onClick={() => handleUserVinculoAction(vinculo.id, "aprovar")}
                        >
                          Aprovar
                        </Button>
                      )}
                      {vinculo.status !== "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          disabled={isUpdatingVinculo}
                          onClick={() => handleUserVinculoAction(vinculo.id, "pendenciar")}
                        >
                          Pendenciar
                        </Button>
                      )}
                      {vinculo.status !== "rejeitado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-300 text-rose-700 hover:bg-rose-50"
                          disabled={isUpdatingVinculo}
                          onClick={() => handleUserVinculoAction(vinculo.id, "rejeitar")}
                        >
                          Rejeitar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-slate-700 hover:bg-slate-800 text-white"
                        disabled={isUpdatingVinculo}
                        onClick={() => handleUserVinculoAction(vinculo.id, "desvincular")}
                      >
                        Desvincular
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-teal-300 text-teal-900 hover:bg-teal-50"
              onClick={() => setShowUserVinculosModal(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}