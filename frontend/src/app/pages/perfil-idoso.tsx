import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  Heart,
  MapPin,
  Calendar,
  Music,
  Utensils,
  Smile,
  Edit,
  ArrowLeft,
  Trash2,
  Save,
  Building2,
} from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Footer } from "../components/footer";
import { getApiUrl } from "../config/api";
import { clearAuthSession, getAuthHeaders, getAuthToken, hydrateAuthSessionFromToken } from "../lib/auth";
import { NecessidadesPanel } from "./perfil-idoso/necessidades-panel";

interface Necessidade {
  id: number;
  item: string;
  tipo: "urgente" | "desejado";
  concluida_em?: string | null;
}

interface Idoso {
  id: number;
  nome: string;
  idade: number;
  dataAniversario?: string;
  foto?: string;
  historia?: string;
  hobbies?: string;
  musicaFavorita?: string;
  comidaFavorita?: string;
  necessidades?: Necessidade[];
  userCanEdit?: boolean;
}

interface InstituicaoPerfil {
  usuarioId: number;
  nomeInstituicao: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
}

interface AuthUser {
  id: number;
  tipo: "moderador" | "donatario";
}

export function PerfilIdosoPage() {
  const { id } = useParams();
  const idosoId = Number(id);
  const navigate = useNavigate();
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [instituicao, setInstituicao] = useState<InstituicaoPerfil | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIdoso, setEditedIdoso] = useState<Idoso | null>(null);
  const [necessidadeItem, setNecessidadeItem] = useState("");
  const [necessidadeTipo, setNecessidadeTipo] = useState<"urgente" | "desejado">("urgente");
  const [editingNecessidadeId, setEditingNecessidadeId] = useState<number | null>(null);
  const [isSavingNecessidade, setIsSavingNecessidade] = useState(false);
  const [necessidadeFeedback, setNecessidadeFeedback] = useState("");

  useEffect(() => {
    hydrateAuthSessionFromToken();

    const userData = localStorage.getItem("user");
    if (!userData) {
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser?.id && parsedUser?.tipo) {
        setAuthUser({
          id: Number(parsedUser.id),
          tipo: parsedUser.tipo,
        });
      }
    } catch {
      setAuthUser(null);
    }
  }, []);

  // Função para calcular idade a partir da data de nascimento
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const loadIdosoData = async () => {
    if (!idosoId || Number.isNaN(idosoId)) {
      setIsLoading(false);
      return;
    }

    try {
      const idosoResponse = await fetch(getApiUrl(`/api/idosos/${idosoId}`), {
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (idosoResponse.ok) {
        const idosoPayload = await idosoResponse.json();
        const apiIdoso = idosoPayload.idoso;
        const mappedIdoso: Idoso = {
          id: apiIdoso.id,
          nome: apiIdoso.nome,
          idade: apiIdoso.idade,
          dataAniversario: apiIdoso.data_aniversario,
          foto: apiIdoso.foto_url,
          historia: apiIdoso.historia,
          hobbies: apiIdoso.hobbies,
          musicaFavorita: apiIdoso.musica_favorita,
          comidaFavorita: apiIdoso.comida_favorita,
          necessidades: (apiIdoso.necessidades || []).map((item: any) => ({
            id: item.id,
            item: item.item,
            tipo: item.tipo,
            concluida_em: item.concluida_em,
          })),
          userCanEdit: apiIdoso.user_can_edit || false,
        };

        if (mappedIdoso.dataAniversario) {
          mappedIdoso.idade = calculateAge(mappedIdoso.dataAniversario);
        }

        setIdoso(mappedIdoso);
        setEditedIdoso(mappedIdoso);

        if (apiIdoso.instituicao) {
          setInstituicao({
            usuarioId: Number(apiIdoso.instituicao.usuario_id),
            nomeInstituicao: apiIdoso.instituicao.nome,
            endereco: apiIdoso.instituicao.endereco,
            cidade: apiIdoso.instituicao.cidade,
            estado: apiIdoso.instituicao.estado,
            cep: apiIdoso.instituicao.cep,
            telefone: apiIdoso.instituicao.telefone,
          });
        }
      }
    } catch {
      const idososData = localStorage.getItem("idosos");
      if (idososData) {
        const idosos = JSON.parse(idososData);
        const idosoEncontrado = idosos.find((i: Idoso) => i.id === idosoId);
        if (idosoEncontrado && idosoEncontrado.dataAniversario) {
          idosoEncontrado.idade = calculateAge(idosoEncontrado.dataAniversario);
        }
        setIdoso(idosoEncontrado);
        setEditedIdoso(idosoEncontrado);
      }

      const instituicaoData = localStorage.getItem("instituicao");
      if (instituicaoData) {
        const parsedInstituicao = JSON.parse(instituicaoData);
        setInstituicao({
          usuarioId: 0,
          nomeInstituicao: parsedInstituicao.nomeInstituicao,
          endereco: parsedInstituicao.endereco,
          cidade: parsedInstituicao.cidade,
          estado: parsedInstituicao.estado,
          cep: parsedInstituicao.cep,
          telefone: parsedInstituicao.telefone,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!idosoId || Number.isNaN(idosoId)) {
      setIsLoading(false);
      return;
    }
    loadIdosoData();
  }, [idosoId]);

  const hasActiveSession = Boolean(authUser && getAuthToken());
  const canManageProfile = hasActiveSession && idoso?.userCanEdit === true;
  const isEditMode = Boolean(canManageProfile && isEditing);
  const quickAccessPath = authUser?.tipo === "moderador" ? "/moderador" : "/dashboard";
  const quickAccessLabel = authUser?.tipo === "moderador" ? "Moderador" : "Minha instituição";
  const backPath = authUser ? "/dashboard" : "/";

  const handleEdit = () => {
    if (!canManageProfile) {
      return;
    }
    resetNecessidadeForm();
    setNecessidadeFeedback("");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!canManageProfile || !editedIdoso || !idosoId) return;

    // Recalcular idade baseado na data de nascimento antes de salvar
    if (editedIdoso.dataAniversario) {
      editedIdoso.idade = calculateAge(editedIdoso.dataAniversario);
    }

    try {
      const response = await fetch(getApiUrl(`/api/idosos/${idosoId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          nome: editedIdoso.nome,
          idade: editedIdoso.idade,
          dataAniversario: editedIdoso.dataAniversario || null,
          historia: editedIdoso.historia || null,
          hobbies: editedIdoso.hobbies || null,
          musicaFavorita: editedIdoso.musicaFavorita || null,
          comidaFavorita: editedIdoso.comidaFavorita || null,
        }),
      });

      if (response.status === 401) {
        clearAuthSession();
        navigate("/login");
        return;
      }
    } catch {
      // se a API falhar, mantem compatibilidade com armazenamento local
    }

    const idososData = localStorage.getItem("idosos");
    if (idososData) {
      const idosos = JSON.parse(idososData);
      const idososAtualizados = idosos.map((i: Idoso) => (i.id === idosoId ? editedIdoso : i));
      localStorage.setItem("idosos", JSON.stringify(idososAtualizados));
    }

    setIdoso(editedIdoso);
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setEditedIdoso(idoso);
    resetNecessidadeForm();
    setNecessidadeFeedback("");
    setIsEditing(false);
  };

  const resetNecessidadeForm = () => {
    setNecessidadeItem("");
    setNecessidadeTipo("urgente");
    setEditingNecessidadeId(null);
  };

  const handleEditNecessidade = (necessidade: Necessidade) => {
    setNecessidadeItem(necessidade.item);
    setNecessidadeTipo(necessidade.tipo);
    setEditingNecessidadeId(necessidade.id);
    setNecessidadeFeedback("");
  };

  const handleSaveNecessidade = async () => {
    if (!canManageProfile || !idosoId) return;

    const item = necessidadeItem.trim();
    if (!item) {
      setNecessidadeFeedback("Informe o item da necessidade.");
      return;
    }

    try {
      setIsSavingNecessidade(true);
      setNecessidadeFeedback("");

      const isEditingNecessidade = editingNecessidadeId !== null;
      const endpoint = isEditingNecessidade
        ? getApiUrl(`/api/idosos/${idosoId}/necessidades/${editingNecessidadeId}`)
        : getApiUrl(`/api/idosos/${idosoId}/necessidades`);

      const response = await fetch(endpoint, {
        method: isEditingNecessidade ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          item,
          tipo: necessidadeTipo,
        }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        clearAuthSession();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel salvar a necessidade.");
      }

      await loadIdosoData();
      resetNecessidadeForm();
      setNecessidadeFeedback(isEditingNecessidade ? "Necessidade atualizada." : "Necessidade adicionada.");
    } catch (error: any) {
      setNecessidadeFeedback(error?.message || "Erro ao salvar necessidade.");
    } finally {
      setIsSavingNecessidade(false);
    }
  };

  const handleConcluirNecessidade = async (necessidadeId: number) => {
    if (!canManageProfile || !idosoId) return;

    try {
      setIsSavingNecessidade(true);
      setNecessidadeFeedback("");

      const response = await fetch(getApiUrl(`/api/idosos/${idosoId}/necessidades/${necessidadeId}/concluir`), {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
        },
      });

      const payload = await response.json();

      if (response.status === 401) {
        clearAuthSession();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message || "Nao foi possivel concluir a necessidade.");
      }

      await loadIdosoData();
      setNecessidadeFeedback("Necessidade concluída.");
      if (editingNecessidadeId === necessidadeId) {
        resetNecessidadeForm();
      }
    } catch (error: any) {
      setNecessidadeFeedback(error?.message || "Erro ao concluir necessidade.");
    } finally {
      setIsSavingNecessidade(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
          <p className="text-xl text-teal-900">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!idoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-teal-900 mb-4">Idoso não encontrado</p>
          <Link to={backPath}>
            <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const necessidadesAtuais = isEditMode ? editedIdoso?.necessidades : idoso.necessidades;
  const urgentes = necessidadesAtuais?.filter((necessidade: Necessidade) => necessidade.tipo === "urgente") || [];
  const desejados = necessidadesAtuais?.filter((necessidade: Necessidade) => necessidade.tipo === "desejado") || [];

  const handleDeleteIdoso = () => {
    if (!canManageProfile || !idosoId) return;

    const deleteByApi = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/idosos/${idosoId}`), {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        });

        if (response.status === 401) {
          clearAuthSession();
          navigate("/login");
          return;
        }
      } catch {
        // fallback local
      }

      const idososData = localStorage.getItem("idosos");
      if (idososData) {
        const idosos = JSON.parse(idososData);
        const idososAtualizados = idosos.filter((i: Idoso) => i.id !== idosoId);
        localStorage.setItem("idosos", JSON.stringify(idososAtualizados));
      }

      navigate(backPath);
    };

    deleteByApi();
  };

  const displayIdoso = isEditMode ? editedIdoso : idoso;

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
            {authUser && (
              <Link to={quickAccessPath}>
                <Button
                  variant="outline"
                  className="border-teal-700 text-teal-900 hover:bg-teal-50"
                >
                  <Building2 className="w-4 h-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">{quickAccessLabel}</span>
                </Button>
              </Link>
            )}
            <Link to={backPath}>
              <Button
                variant="outline"
                className="border-teal-700 text-teal-900 hover:bg-teal-50"
              >
                <ArrowLeft className="w-4 h-4 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {displayIdoso?.foto ? (
              <img
                src={displayIdoso.foto}
                alt={displayIdoso.nome}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center border-4 border-white shadow-lg">
                <Smile className="w-16 h-16" />
              </div>
            )}
            <div className="text-center md:text-left flex-1">
              {isEditMode ? (
                <Input
                  value={editedIdoso?.nome || ""}
                  onChange={(e) =>
                    setEditedIdoso((prev) =>
                      prev ? { ...prev, nome: e.target.value } : null
                    )
                  }
                  className="text-4xl md:text-5xl mb-2 bg-white/10 border-white text-white placeholder:text-white/70"
                />
              ) : (
                <h1 className="text-4xl md:text-5xl mb-2">{displayIdoso?.nome}</h1>
              )}
              <p className="text-xl text-teal-100">{displayIdoso?.idade} anos</p>
              {(displayIdoso?.dataAniversario || isEditMode) && (
                <div className="flex items-center gap-2 mt-2 text-teal-100 justify-center md:justify-start">
                  <Calendar className="w-5 h-5" />
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Aniversário:</span>
                      <Input
                        type="date"
                        value={editedIdoso?.dataAniversario || ""}
                        onChange={(e) =>
                          setEditedIdoso((prev) =>
                            prev ? { ...prev, dataAniversario: e.target.value } : null
                          )
                        }
                        className="bg-white/10 border-white text-white"
                      />
                    </div>
                  ) : (
                    <span>
                      Aniversário:{" "}
                      {displayIdoso?.dataAniversario
                        ? new Date(displayIdoso.dataAniversario).toLocaleDateString("pt-BR", {
                            month: "long",
                            day: "numeric",
                          })
                        : "Nao informado"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* História e Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            {/* História */}
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="text-teal-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#E88080]" />
                  História
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <textarea
                    value={editedIdoso?.historia || ""}
                    onChange={(e) =>
                      setEditedIdoso((prev) =>
                        prev ? { ...prev, historia: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[120px]"
                    placeholder="Conte a história..."
                  />
                ) : (
                  <p className="text-teal-800 leading-relaxed">{displayIdoso?.historia}</p>
                )}
              </CardContent>
            </Card>

            {/* Preferências */}
            <div className="grid md:grid-cols-3 gap-4">
              {(displayIdoso?.hobbies || isEditMode) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Smile className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Hobbies</h3>
                    </div>
                    {isEditMode ? (
                      <Input
                        value={editedIdoso?.hobbies || ""}
                        onChange={(e) =>
                          setEditedIdoso((prev) =>
                            prev ? { ...prev, hobbies: e.target.value } : null
                          )
                        }
                        className="w-full"
                        placeholder="Hobbies favoritos"
                      />
                    ) : (
                      <p className="text-teal-700">{displayIdoso?.hobbies}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {(displayIdoso?.musicaFavorita || isEditMode) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Música</h3>
                    </div>
                    {isEditMode ? (
                      <Input
                        value={editedIdoso?.musicaFavorita || ""}
                        onChange={(e) =>
                          setEditedIdoso((prev) =>
                            prev ? { ...prev, musicaFavorita: e.target.value } : null
                          )
                        }
                        className="w-full"
                        placeholder="Música favorita"
                      />
                    ) : (
                      <p className="text-teal-700">{displayIdoso?.musicaFavorita}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {(displayIdoso?.comidaFavorita || isEditMode) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Comida</h3>
                    </div>
                    {isEditMode ? (
                      <Input
                        value={editedIdoso?.comidaFavorita || ""}
                        onChange={(e) =>
                          setEditedIdoso((prev) =>
                            prev ? { ...prev, comidaFavorita: e.target.value } : null
                          )
                        }
                        className="w-full"
                        placeholder="Comida favorita"
                      />
                    ) : (
                      <p className="text-teal-700">{displayIdoso?.comidaFavorita}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <NecessidadesPanel
              isEditMode={isEditMode}
              editingNecessidadeId={editingNecessidadeId}
              necessidadeItem={necessidadeItem}
              onNecessidadeItemChange={setNecessidadeItem}
              necessidadeTipo={necessidadeTipo}
              onNecessidadeTipoChange={setNecessidadeTipo}
              isSavingNecessidade={isSavingNecessidade}
              necessidadeFeedback={necessidadeFeedback}
              urgentes={urgentes}
              desejados={desejados}
              onSaveNecessidade={handleSaveNecessidade}
              onResetNecessidadeForm={resetNecessidadeForm}
              onEditNecessidade={handleEditNecessidade}
              onConcluirNecessidade={handleConcluirNecessidade}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instituição */}
            {instituicao && (
              <Card className="border-teal-200">
                <CardHeader>
                  <CardTitle className="text-teal-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    Instituição
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-teal-900 font-medium">
                      {instituicao.nomeInstituicao}
                    </p>
                  </div>
                  {instituicao.endereco && (
                    <div>
                      <p className="text-sm text-teal-700">
                        {instituicao.endereco}
                      </p>
                      <p className="text-sm text-teal-700">
                        {instituicao.cidade} - {instituicao.estado}
                      </p>
                      <p className="text-sm text-teal-700">{instituicao.cep}</p>
                    </div>
                  )}
                  {instituicao.telefone && (
                    <div>
                      <p className="text-sm text-teal-700">
                        Telefone: {instituicao.telefone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            {isEditMode ? (
              <div className="space-y-3">
                <Button
                  onClick={handleSave}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button
                  onClick={handleCancelEditing}
                  variant="outline"
                  className="w-full border-teal-300 text-teal-900 hover:bg-teal-50"
                >
                  Cancelar
                </Button>
              </div>
            ) : canManageProfile ? (
              <>
                <Button
                  onClick={handleEdit}
                  className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>

                {/* Botão Excluir */}
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-[#E88080] hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Idoso
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-teal-900">Excluir Idoso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este idoso? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-teal-300 text-teal-900 hover:bg-teal-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteIdoso}
              className="bg-[#E88080] hover:bg-red-600 text-white"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}