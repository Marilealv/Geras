import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Heart, MapPin, Calendar, Music, Utensils, Smile, Edit, ArrowLeft, Trash2, Save, Building2 } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
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

interface Necessidade {
  id: string;
  item: string;
  tipo: "urgente" | "desejado";
}

interface Idoso {
  id: string;
  nome: string;
  idade: number;
  dataAniversario?: string;
  foto?: string;
  historia?: string;
  hobbies?: string;
  musicaFavorita?: string;
  comidaFavorita?: string;
  necessidades?: Necessidade[];
}

export function PerfilIdosoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [instituicao, setInstituicao] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIdoso, setEditedIdoso] = useState<Idoso | null>(null);

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

  useEffect(() => {
    // Carregar dados do idoso
    const idososData = localStorage.getItem("idosos");
    if (idososData) {
      const idosos = JSON.parse(idososData);
      const idosoEncontrado = idosos.find((i: Idoso) => i.id === id);
      // Calcular idade baseado na data de nascimento
      if (idosoEncontrado && idosoEncontrado.dataAniversario) {
        idosoEncontrado.idade = calculateAge(idosoEncontrado.dataAniversario);
      }
      setIdoso(idosoEncontrado);
      setEditedIdoso(idosoEncontrado);
    }

    // Carregar dados da instituição
    const instituicaoData = localStorage.getItem("instituicao");
    if (instituicaoData) {
      setInstituicao(JSON.parse(instituicaoData));
    }
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedIdoso || !id) return;

    // Recalcular idade baseado na data de nascimento antes de salvar
    if (editedIdoso.dataAniversario) {
      editedIdoso.idade = calculateAge(editedIdoso.dataAniversario);
    }

    // Salvar alterações no localStorage
    const idososData = localStorage.getItem("idosos");
    if (idososData) {
      const idosos = JSON.parse(idososData);
      const idososAtualizados = idosos.map((i: Idoso) =>
        i.id === id ? editedIdoso : i
      );
      localStorage.setItem("idosos", JSON.stringify(idososAtualizados));
      setIdoso(editedIdoso);
      setIsEditing(false);
    }
  };

  const handleCancelEditing = () => {
    setEditedIdoso(idoso);
    setIsEditing(false);
  };

  if (!idoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-teal-900 mb-4">Idoso não encontrado</p>
          <Link to="/dashboard">
            <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const urgentes = (isEditing ? editedIdoso?.necessidades : idoso.necessidades)?.filter((n) => n.tipo === "urgente") || [];
  const desejados = (isEditing ? editedIdoso?.necessidades : idoso.necessidades)?.filter((n) => n.tipo === "desejado") || [];

  const handleDeleteIdoso = () => {
    if (!id) return;

    // Remover idoso do localStorage
    const idososData = localStorage.getItem("idosos");
    if (idososData) {
      const idosos = JSON.parse(idososData);
      const idososAtualizados = idosos.filter((i: Idoso) => i.id !== id);
      localStorage.setItem("idosos", JSON.stringify(idososAtualizados));
    }

    // Redirecionar para o dashboard
    navigate("/dashboard");
  };

  const displayIdoso = isEditing ? editedIdoso : idoso;

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
            {instituicao && (
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  className="border-teal-700 text-teal-900 hover:bg-teal-50"
                >
                  <Building2 className="w-4 h-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Ir para instituição</span>
                </Button>
              </Link>
            )}
            <Link to="/dashboard">
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
              {isEditing ? (
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
              {(displayIdoso?.dataAniversario || isEditing) && (
                <div className="flex items-center gap-2 mt-2 text-teal-100 justify-center md:justify-start">
                  <Calendar className="w-5 h-5" />
                  {isEditing ? (
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
                      {new Date(displayIdoso.dataAniversario).toLocaleDateString("pt-BR")}
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
                {isEditing ? (
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
              {(displayIdoso?.hobbies || isEditing) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Smile className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Hobbies</h3>
                    </div>
                    {isEditing ? (
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

              {(displayIdoso?.musicaFavorita || isEditing) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Música</h3>
                    </div>
                    {isEditing ? (
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

              {(displayIdoso?.comidaFavorita || isEditing) && (
                <Card className="border-teal-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="w-5 h-5 text-teal-600" />
                      <h3 className="text-teal-900 font-medium">Comida</h3>
                    </div>
                    {isEditing ? (
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

            {/* Necessidades e Desejos */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Urgentes */}
              {urgentes.length > 0 && (
                <Card className="border-[#E88080] bg-[#E88080]/5">
                  <CardHeader>
                    <CardTitle className="text-teal-900">
                      Itens Urgentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-teal-700 mb-4">
                      Produtos de beleza e cuidados pessoais fundamentais para o dia a
                      dia
                    </p>
                    <div className="space-y-2">
                      {urgentes.map((item) => (
                        <Badge
                          key={item.id}
                          variant="outline"
                          className="bg-[#E88080] text-white border-[#E88080] block w-full py-2 text-center"
                        >
                          {item.item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Desejados */}
              {desejados.length > 0 && (
                <Card className="border-teal-600 bg-teal-600/5">
                  <CardHeader>
                    <CardTitle className="text-teal-900">
                      Itens Desejados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-teal-700 mb-4">
                      Presentes, visitas e gestos que trazem alegria
                    </p>
                    <div className="space-y-2">
                      {desejados.map((item) => (
                        <Badge
                          key={item.id}
                          variant="outline"
                          className="bg-teal-600 text-white border-teal-600 block w-full py-2 text-center"
                        >
                          {item.item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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
            {isEditing ? (
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
            ) : (
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
            )}
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