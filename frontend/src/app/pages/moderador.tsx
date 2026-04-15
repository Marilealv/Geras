import { useState, useEffect, type ChangeEvent } from "react";
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
  SlidersHorizontal,
} from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, hydrateAuthSessionFromToken, logoutFromServer } from "../lib/auth";
import { ModeradorModals } from "./moderador/modals";

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
  instituicoes_aprovadas: number;
  vinculos_pendentes: number;
}

interface InstituicaoBusca {
  id: number;
  nome: string;
  cnpj: string;
  cidade: string;
  estado: string;
  status: string;
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
  const [userActionFeedbackType, setUserActionFeedbackType] = useState<"info" | "success" | "error">("info");
  const [showUserVinculosModal, setShowUserVinculosModal] = useState(false);
  const [showUserActionsModal, setShowUserActionsModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<ModeradorUsuario | null>(null);
  const [userVinculos, setUserVinculos] = useState<ModeradorVinculoUsuario[]>([]);
  const [isLoadingVinculos, setIsLoadingVinculos] = useState(false);
  const [isUpdatingVinculo, setIsUpdatingVinculo] = useState(false);
  const [vinculoNotice, setVinculoNotice] = useState("");
  const [vinculoNoticeType, setVinculoNoticeType] = useState<"info" | "success" | "error">("info");
  const [buscaInstituicao, setBuscaInstituicao] = useState("");
  const [resultadosBuscaInstituicao, setResultadosBuscaInstituicao] = useState<InstituicaoBusca[]>([]);
  const [isBuscandoInstituicoes, setIsBuscandoInstituicoes] = useState(false);
  const [isVinculandoInstituicao, setIsVinculandoInstituicao] = useState(false);
  const [showUserFilters, setShowUserFilters] = useState(false);
  const [showInstitutionFilters, setShowInstitutionFilters] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [institutionSearchTerm, setInstitutionSearchTerm] = useState("");
  const [userTypeFilters, setUserTypeFilters] = useState({ moderador: true, donatario: true });
  const [userStatusFilters, setUserStatusFilters] = useState({ ativo: true, pendente: true, bloqueado: true });
  const [institutionStatusFilters, setInstitutionStatusFilters] = useState({
    pendente: true,
    ativa: true,
    desativada: true,
    recusada: true,
  });

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
    const mappedUsuarios = (payload.usuarios || []).map((usuario: any) => ({
      ...usuario,
      instituicoes_aprovadas: Number(usuario.instituicoes_aprovadas || 0),
      vinculos_pendentes: Number(usuario.vinculos_pendentes || 0),
    }));

    setUsuarios(mappedUsuarios);
    return mappedUsuarios;
  };

  const handleUserAction = async (userId: number, action: string) => {
    const body: Record<string, unknown> = { action };

    if (action === "trocarSenha") {
      const novaSenha = window.prompt("Digite a nova senha para o usuario:");
      if (!novaSenha) return;
      body.novaSenha = novaSenha;
    }

    try {
      setIsUpdatingUser(true);
      setUpdatingUserId(userId);
      setUserActionFeedbackType("info");
      setUserActionFeedback("Atualizando usuário...");

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

      const updatedUsuarios = await loadUsuarios();
      const updatedUsuario = updatedUsuarios.find((usuario: ModeradorUsuario) => usuario.id === userId) || payload.usuario;

      if (updatedUsuario) {
        setSelectedUsuario(updatedUsuario);
      }

      setUserActionFeedbackType("success");
      setUserActionFeedback("Atualizado com sucesso.");
    } catch (error: any) {
      setUserActionFeedbackType("error");
      setUserActionFeedback(error?.message || "Erro ao executar acao de usuario.");
    } finally {
      setIsUpdatingUser(false);
      setUpdatingUserId(null);

      window.setTimeout(() => {
        setUserActionFeedback("");
        setUserActionFeedbackType("info");
      }, 1800);
    }
  };

  const loadUserVinculos = async (userId: number) => {
    setIsLoadingVinculos(true);
    setVinculoNotice("");

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
      setVinculoNoticeType("error");
      setVinculoNotice(error?.message || "Erro ao carregar vinculos do usuario.");
      setUserVinculos([]);
    } finally {
      setIsLoadingVinculos(false);
    }
  };

  const handleOpenUserVinculos = async (usuario: ModeradorUsuario) => {
    setSelectedUsuario(usuario);
    setShowUserVinculosModal(true);
    setBuscaInstituicao("");
    setResultadosBuscaInstituicao([]);
    setVinculoNotice("");
    await loadUserVinculos(usuario.id);
  };

  const handleOpenUserActions = (usuario: ModeradorUsuario) => {
    setSelectedUsuario(usuario);
    setUserActionFeedback("");
    setUserActionFeedbackType("info");
    setShowUserActionsModal(true);
  };

  const handleUserVinculoAction = async (
    vinculoId: number,
    action: "aprovar" | "pendenciar" | "rejeitar" | "desvincular"
  ) => {
    if (!selectedUsuario) return;

    try {
      setIsUpdatingVinculo(true);
      setVinculoNoticeType("info");
      setVinculoNotice("Atualizando vínculo...");

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

      const updatedUsuarios = await loadUsuarios();
      const updatedUsuario = updatedUsuarios.find((usuario: ModeradorUsuario) => usuario.id === selectedUsuario.id);

      if (updatedUsuario) {
        setSelectedUsuario(updatedUsuario);
      }

      await loadUserVinculos(selectedUsuario.id);
      setVinculoNoticeType("success");
      setVinculoNotice("Vínculo atualizado com sucesso.");
    } catch (error: any) {
      setVinculoNoticeType("error");
      setVinculoNotice(error?.message || "Erro ao atualizar vinculo do usuario.");
    } finally {
      setIsUpdatingVinculo(false);
    }
  };

  const handleBuscarInstituicoesUsuario = async () => {
    const query = buscaInstituicao.trim();

    if (query.length < 2) {
      setVinculoNoticeType("info");
      setVinculoNotice("Digite ao menos 2 caracteres para buscar.");
      setResultadosBuscaInstituicao([]);
      return;
    }

    try {
      setIsBuscandoInstituicoes(true);
      setVinculoNoticeType("info");
      setVinculoNotice("Buscando instituições...");

      const response = await fetch(getApiUrl(`/api/instituicoes/search?query=${encodeURIComponent(query)}`), {
        headers: {
          ...getAuthHeaders(),
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel buscar instituicoes.");
      }

      setResultadosBuscaInstituicao(payload.instituicoes || []);
      setVinculoNoticeType("success");
      setVinculoNotice(
        payload.instituicoes?.length ? "Selecione uma instituição para tornar o usuário membro." : "Nenhuma instituição encontrada."
      );
    } catch (error: any) {
      setResultadosBuscaInstituicao([]);
      setVinculoNoticeType("error");
      setVinculoNotice(error?.message || "Erro ao buscar instituicoes.");
    } finally {
      setIsBuscandoInstituicoes(false);
    }
  };

  const handleVincularInstituicao = async (instituicaoId: number) => {
    if (!selectedUsuario) return;

    try {
      setIsVinculandoInstituicao(true);
      setVinculoNoticeType("info");
      setVinculoNotice("Atualizando vínculo do usuário...");

      const response = await fetch(getApiUrl(`/api/moderador/usuarios/${selectedUsuario.id}/vinculos`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ instituicaoId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel vincular o usuario.");
      }

      const updatedUsuarios = await loadUsuarios();
      const updatedUsuario = updatedUsuarios.find((usuario: ModeradorUsuario) => usuario.id === selectedUsuario.id);

      if (updatedUsuario) {
        setSelectedUsuario(updatedUsuario);
      }

      await loadUserVinculos(selectedUsuario.id);
      setVinculoNoticeType("success");
      setVinculoNotice("Usuário vinculado com sucesso.");
    } catch (error: any) {
      setVinculoNoticeType("error");
      setVinculoNotice(error?.message || "Erro ao vincular usuario a instituicao.");
    } finally {
      setIsVinculandoInstituicao(false);
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

    let parsedUser: { tipo?: string; precisaTrocarSenha?: boolean } | null = null;
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

    if (parsedUser?.precisaTrocarSenha) {
      navigate("/trocar-senha", { replace: true });
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

    if (usuario.tipo_usuario === "donatario" && Number(usuario.instituicoes_aprovadas || 0) === 0) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>;
    }

    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ativo</Badge>;
  };

  const getPasswordBadge = (usuario: ModeradorUsuario) => {
    if (usuario.precisa_trocar_senha) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Troca de senha pendente</Badge>;
    }

    return <Badge className="bg-sky-100 text-sky-700 border-sky-200">Senha definida</Badge>;
  };

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const getUserStatusKey = (usuario: ModeradorUsuario) => {
    if (usuario.bloqueado) {
      return "bloqueado";
    }

    if (usuario.tipo_usuario === "donatario" && Number(usuario.instituicoes_aprovadas || 0) === 0) {
      return "pendente";
    }

    return "ativo";
  };

  const filteredUsuarios = usuarios.filter((usuario: ModeradorUsuario) => {
    const searchTerm = normalizeText(userSearchTerm);
    const searchableText = normalizeText(
      [
        usuario.nome_responsavel,
        usuario.email,
        usuario.telefone,
        String((usuario as ModeradorUsuario & { cpf?: string }).cpf || ""),
      ].join(" ")
    );

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesType = userTypeFilters[usuario.tipo_usuario];
    const matchesStatus = userStatusFilters[getUserStatusKey(usuario) as keyof typeof userStatusFilters];

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredInstituicoes = instituicoes.filter((instituicao: Instituicao) => {
    const searchTerm = normalizeText(institutionSearchTerm);
    const searchableText = normalizeText(
      [instituicao.nomeInstituicao, instituicao.cnpj, instituicao.cidade, instituicao.estado].join(" ")
    );

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesStatus = institutionStatusFilters[instituicao.status as keyof typeof institutionStatusFilters];

    return matchesSearch && matchesStatus;
  });

  const filteredInstituicoesPendentes = filteredInstituicoes.filter(
    (instituicao: Instituicao) => instituicao.status === "pendente"
  );

  const instituicoesPendentes = filteredInstituicoesPendentes;

  const sectionTitleMap: Record<"menu" | "usuarios" | "instituicoes", string> = {
    menu: "Painel do Moderador",
    usuarios: "Editar Usuários",
    instituicoes: "Verificar Instituições",
  };
  const currentSectionKey: "menu" | "usuarios" | "instituicoes" = activeSection;
  const sectionTitle = sectionTitleMap[currentSectionKey];

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
          {isSubmittingAction && (
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
              <CardTitle className="text-2xl text-teal-900">Gestão de Usuários ({filteredUsuarios.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input
                  value={userSearchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou CPF"
                  className="border-teal-200 lg:max-w-md"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUserFilters((open: boolean) => !open)}
                  className="border-teal-300 text-teal-900 hover:bg-teal-50"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>

              {showUserFilters && (
                <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-medium text-teal-900">Tipo</p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 text-sm text-teal-800">
                          <Checkbox
                            checked={userTypeFilters.moderador}
                            onCheckedChange={(checked) =>
                              setUserTypeFilters((prev) => ({
                                ...prev,
                                moderador: Boolean(checked),
                              }))
                            }
                          />
                          Moderador
                        </label>
                        <label className="flex items-center gap-3 text-sm text-teal-800">
                          <Checkbox
                            checked={userTypeFilters.donatario}
                            onCheckedChange={(checked) =>
                              setUserTypeFilters((prev) => ({
                                ...prev,
                                donatario: Boolean(checked),
                              }))
                            }
                          />
                          Donatário
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-teal-900">Status</p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 text-sm text-teal-800">
                          <Checkbox
                            checked={userStatusFilters.ativo}
                            onCheckedChange={(checked) =>
                              setUserStatusFilters((prev) => ({
                                ...prev,
                                ativo: Boolean(checked),
                              }))
                            }
                          />
                          Ativo
                        </label>
                        <label className="flex items-center gap-3 text-sm text-teal-800">
                          <Checkbox
                            checked={userStatusFilters.pendente}
                            onCheckedChange={(checked) =>
                              setUserStatusFilters((prev) => ({
                                ...prev,
                                pendente: Boolean(checked),
                              }))
                            }
                          />
                          Pendente
                        </label>
                        <label className="flex items-center gap-3 text-sm text-teal-800">
                          <Checkbox
                            checked={userStatusFilters.bloqueado}
                            onCheckedChange={(checked) =>
                              setUserStatusFilters((prev) => ({
                                ...prev,
                                bloqueado: Boolean(checked),
                              }))
                            }
                          />
                          Bloqueado
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setUserSearchTerm("");
                        setUserTypeFilters({ moderador: true, donatario: true });
                        setUserStatusFilters({ ativo: true, pendente: true, bloqueado: true });
                      }}
                      className="text-teal-800 hover:bg-teal-100"
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              )}

              {filteredUsuarios.length === 0 ? (
                <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 py-10 text-center text-teal-700">
                  Nenhum usuário encontrado com os filtros atuais.
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-teal-200">
                      <th className="text-left py-3 px-2 text-teal-900">Usuário</th>
                      <th className="text-left py-3 px-2 text-teal-900 hidden md:table-cell">Tipo</th>
                      <th className="text-left py-3 px-2 text-teal-900 hidden lg:table-cell">Status</th>
                      <th className="text-left py-3 px-2 text-teal-900 hidden lg:table-cell">Senha</th>
                      <th className="text-right py-3 px-2 text-teal-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsuarios.map((usuario) => (
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
                          {getUserStatusBadge(usuario)}
                        </td>
                        <td className="py-3 px-2 hidden lg:table-cell text-teal-800">
                          {getPasswordBadge(usuario)}
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
              )}
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
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={institutionSearchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInstitutionSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou CNPJ"
                className="border-teal-200 lg:max-w-md"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInstitutionFilters((open: boolean) => !open)}
                className="border-teal-300 text-teal-900 hover:bg-teal-50"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>

            {showInstitutionFilters && (
              <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                <p className="mb-3 text-sm font-medium text-teal-900">Status</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex items-center gap-3 text-sm text-teal-800">
                    <Checkbox
                      checked={institutionStatusFilters.pendente}
                      onCheckedChange={(checked) =>
                        setInstitutionStatusFilters((prev) => ({
                          ...prev,
                          pendente: Boolean(checked),
                        }))
                      }
                    />
                    Pendente
                  </label>
                  <label className="flex items-center gap-3 text-sm text-teal-800">
                    <Checkbox
                      checked={institutionStatusFilters.ativa}
                      onCheckedChange={(checked) =>
                        setInstitutionStatusFilters((prev) => ({
                          ...prev,
                          ativa: Boolean(checked),
                        }))
                      }
                    />
                    Ativa
                  </label>
                  <label className="flex items-center gap-3 text-sm text-teal-800">
                    <Checkbox
                      checked={institutionStatusFilters.desativada}
                      onCheckedChange={(checked) =>
                        setInstitutionStatusFilters((prev) => ({
                          ...prev,
                          desativada: Boolean(checked),
                        }))
                      }
                    />
                    Desativada
                  </label>
                  <label className="flex items-center gap-3 text-sm text-teal-800">
                    <Checkbox
                      checked={institutionStatusFilters.recusada}
                      onCheckedChange={(checked) =>
                        setInstitutionStatusFilters((prev) => ({
                          ...prev,
                          recusada: Boolean(checked),
                        }))
                      }
                    />
                    Recusada
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInstitutionSearchTerm("");
                      setInstitutionStatusFilters({
                        pendente: true,
                        ativa: true,
                        desativada: true,
                        recusada: true,
                      });
                    }}
                    className="text-teal-800 hover:bg-teal-100"
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>
            )}

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
              Todas as Instituições ({filteredInstituicoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredInstituicoes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 py-10 text-center text-teal-700">
                Nenhuma instituição encontrada com os filtros atuais.
              </div>
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
                  {filteredInstituicoes.map((instituicao) => (
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
            )}
          </CardContent>
        </Card>
        </>
        )}
          </>
        )}
      </div>

      <ModeradorModals
        showDetailsModal={showDetailsModal}
        setShowDetailsModal={setShowDetailsModal}
        selectedInstituicao={selectedInstituicao}
        handleAccessAsAdmin={handleAccessAsAdmin}
        handleAction={handleAction}
        getStatusBadge={getStatusBadge}
        getStatusText={getStatusText}
        showActionModal={showActionModal}
        setShowActionModal={setShowActionModal}
        actionType={actionType}
        motivoRecusa={motivoRecusa}
        setMotivoRecusa={setMotivoRecusa}
        confirmAction={confirmAction}
        isSubmittingAction={isSubmittingAction}
        showUserActionsModal={showUserActionsModal}
        setShowUserActionsModal={setShowUserActionsModal}
        selectedUsuario={selectedUsuario}
        userActionFeedback={userActionFeedback}
        userActionFeedbackType={userActionFeedbackType}
        isUpdatingUser={isUpdatingUser}
        handleOpenUserVinculos={handleOpenUserVinculos}
        handleUserAction={handleUserAction}
        showUserVinculosModal={showUserVinculosModal}
        setShowUserVinculosModal={setShowUserVinculosModal}
        vinculoNotice={vinculoNotice}
        vinculoNoticeType={vinculoNoticeType}
        buscaInstituicao={buscaInstituicao}
        setBuscaInstituicao={setBuscaInstituicao}
        handleBuscarInstituicoesUsuario={handleBuscarInstituicoesUsuario}
        isBuscandoInstituicoes={isBuscandoInstituicoes}
        isVinculandoInstituicao={isVinculandoInstituicao}
        resultadosBuscaInstituicao={resultadosBuscaInstituicao}
        handleVincularInstituicao={handleVincularInstituicao}
        isLoadingVinculos={isLoadingVinculos}
        userVinculos={userVinculos}
        handleUserVinculoAction={handleUserVinculoAction}
      />
    </div>
  );
}