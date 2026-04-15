import { type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router";
import { Plus, Home as HomeIcon, Users, Edit, Save } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

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

interface VinculoPendenteItem {
  id: number;
  usuario_id: number;
  nome_responsavel: string;
  email: string;
}

interface DashboardContentProps {
  instituicao: Instituicao | null;
  editedInstituicao: Instituicao | null;
  setEditedInstituicao: Dispatch<SetStateAction<Instituicao | null>>;
  isEditingInstituicao: boolean;
  onEditInstituicao: () => void;
  onSaveInstituicao: () => void;
  onCancelEditInstituicao: () => void;
  vinculosPendentes: VinculoPendenteItem[];
  handleAprovarVinculo: (vinculoId: number, action: "aprovar" | "recusar") => void;
  canCadastrarIdoso: boolean;
  idosos: Idoso[];
  showSuccessModal: boolean;
  onCloseSuccessModal: () => void;
}

export function DashboardContent({
  instituicao,
  editedInstituicao,
  setEditedInstituicao,
  isEditingInstituicao,
  onEditInstituicao,
  onSaveInstituicao,
  onCancelEditInstituicao,
  vinculosPendentes,
  handleAprovarVinculo,
  canCadastrarIdoso,
  idosos,
  showSuccessModal,
  onCloseSuccessModal,
}: DashboardContentProps) {
  const updateEditedInstituicao = (field: keyof Instituicao, value: string) => {
    setEditedInstituicao((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <>
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
                  onClick={onEditInstituicao}
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
                <label className="text-sm text-teal-700 font-medium mb-1 block">Nome da Instituição</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.nomeInstituicao || ""}
                    onChange={(e) => updateEditedInstituicao("nomeInstituicao", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.nomeInstituicao}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">CNPJ</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.cnpj || ""}
                    onChange={(e) => updateEditedInstituicao("cnpj", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.cnpj}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">Endereço</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.endereco || ""}
                    onChange={(e) => updateEditedInstituicao("endereco", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.endereco}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">Telefone</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.telefone || ""}
                    onChange={(e) => updateEditedInstituicao("telefone", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.telefone}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">Cidade</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.cidade || ""}
                    onChange={(e) => updateEditedInstituicao("cidade", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.cidade}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">Estado</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.estado || ""}
                    onChange={(e) => updateEditedInstituicao("estado", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.estado}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-teal-700 font-medium mb-1 block">CEP</label>
                {isEditingInstituicao ? (
                  <Input
                    value={editedInstituicao?.cep || ""}
                    onChange={(e) => updateEditedInstituicao("cep", e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.cep}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-teal-700 font-medium mb-1 block">Descrição</label>
                {isEditingInstituicao ? (
                  <textarea
                    value={editedInstituicao?.descricao || ""}
                    onChange={(e) => updateEditedInstituicao("descricao", e.target.value)}
                    className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px]"
                  />
                ) : (
                  <p className="text-teal-900">{instituicao.descricao}</p>
                )}
              </div>
            </div>

            {isEditingInstituicao && (
              <div className="flex gap-4 mt-6">
                <Button onClick={onSaveInstituicao} className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button
                  onClick={onCancelEditInstituicao}
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
              <h3 className="text-2xl text-teal-900 mb-4">Cadastre sua Instituição</h3>
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
                <p className="text-lg text-teal-700 mb-4">Ainda não há idosos cadastrados</p>
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
                      {idoso.historia && <p className="text-sm text-teal-700 line-clamp-3">{idoso.historia}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl text-teal-900 mb-4">Sucesso!</h3>
            <p className="text-sm text-teal-700 mb-6">
              As informações da instituição foram atualizadas com sucesso.
            </p>
            <Button onClick={onCloseSuccessModal} className="bg-green-600 hover:bg-green-700 text-white">
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}