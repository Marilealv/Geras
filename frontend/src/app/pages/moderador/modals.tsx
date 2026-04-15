import { Ban, CheckCircle, Loader2, RefreshCw, Search, Shield, User, UserCog, UserPlus } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

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

type ActionType = "aprovar" | "recusar" | "desativar" | "excluir" | "reativar" | "pendenciar";
type UserActionType = "tornarModerador" | "tornarDonatario" | "bloquear" | "desbloquear" | "forcarTrocaSenha" | "removerTrocaSenha" | "trocarSenha";

interface ModeradorModalsProps {
  showDetailsModal: boolean;
  setShowDetailsModal: (open: boolean) => void;
  selectedInstituicao: Instituicao | null;
  handleAccessAsAdmin: (instituicao: Instituicao) => void;
  handleAction: (instituicao: Instituicao, action: ActionType) => void;
  getStatusBadge: (status: string) => string;
  getStatusText: (status: string) => string;
  showActionModal: boolean;
  setShowActionModal: (open: boolean) => void;
  actionType: ActionType;
  motivoRecusa: string;
  setMotivoRecusa: (value: string) => void;
  confirmAction: () => void;
  isSubmittingAction: boolean;
  showUserActionsModal: boolean;
  setShowUserActionsModal: (open: boolean) => void;
  selectedUsuario: ModeradorUsuario | null;
  userActionFeedback: string;
  userActionFeedbackType: "info" | "success" | "error";
  isUpdatingUser: boolean;
  handleOpenUserVinculos: (usuario: ModeradorUsuario) => void;
  handleUserAction: (userId: number, action: UserActionType) => void;
  showUserVinculosModal: boolean;
  setShowUserVinculosModal: (open: boolean) => void;
  vinculoNotice: string;
  vinculoNoticeType: "info" | "success" | "error";
  buscaInstituicao: string;
  setBuscaInstituicao: (value: string) => void;
  handleBuscarInstituicoesUsuario: () => void;
  isBuscandoInstituicoes: boolean;
  isVinculandoInstituicao: boolean;
  resultadosBuscaInstituicao: InstituicaoBusca[];
  handleVincularInstituicao: (instituicaoId: number) => void;
  isLoadingVinculos: boolean;
  userVinculos: ModeradorVinculoUsuario[];
  handleUserVinculoAction: (vinculoId: number, action: "aprovar" | "pendenciar" | "rejeitar" | "desvincular") => void;
}

export function ModeradorModals({
  showDetailsModal,
  setShowDetailsModal,
  selectedInstituicao,
  handleAccessAsAdmin,
  handleAction,
  getStatusBadge,
  getStatusText,
  showActionModal,
  setShowActionModal,
  actionType,
  motivoRecusa,
  setMotivoRecusa,
  confirmAction,
  isSubmittingAction,
  showUserActionsModal,
  setShowUserActionsModal,
  selectedUsuario,
  userActionFeedback,
  userActionFeedbackType,
  isUpdatingUser,
  handleOpenUserVinculos,
  handleUserAction,
  showUserVinculosModal,
  setShowUserVinculosModal,
  vinculoNotice,
  vinculoNoticeType,
  buscaInstituicao,
  setBuscaInstituicao,
  handleBuscarInstituicoesUsuario,
  isBuscandoInstituicoes,
  isVinculandoInstituicao,
  resultadosBuscaInstituicao,
  handleVincularInstituicao,
  isLoadingVinculos,
  userVinculos,
  handleUserVinculoAction,
}: ModeradorModalsProps) {
  return (
    <>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedInstituicao.status)}`}>
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
            // reset handled by parent state; keep the modal local and stateless here
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

          {userActionFeedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                userActionFeedbackType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : userActionFeedbackType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-teal-200 bg-teal-50 text-teal-800"
              }`}
            >
              {userActionFeedback}
            </div>
          )}

          {selectedUsuario && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                disabled={isUpdatingUser}
                onClick={() => {
                  setShowUserActionsModal(false);
                  handleOpenUserVinculos(selectedUsuario);
                }}
              >
                <UserCog className="w-4 h-4 mr-2" />
                Ver/Trocar instituições
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                disabled={isUpdatingUser}
                onClick={() => handleUserAction(selectedUsuario.id, "tornarModerador")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Tornar moderador
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                disabled={isUpdatingUser}
                onClick={() => handleUserAction(selectedUsuario.id, "tornarDonatario")}
              >
                <User className="w-4 h-4 mr-2" />
                Tornar donatario
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                disabled={isUpdatingUser}
                onClick={() => handleUserAction(selectedUsuario.id, selectedUsuario.bloqueado ? "desbloquear" : "bloquear")}
              >
                <Ban className="w-4 h-4 mr-2" />
                {selectedUsuario.bloqueado ? "Desbloquear usuário" : "Bloquear usuário"}
              </Button>
              <Button
                variant="outline"
                className="justify-start border-teal-300 text-teal-800 hover:bg-teal-50"
                disabled={isUpdatingUser}
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
                disabled={isUpdatingUser}
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

          {vinculoNotice && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                vinculoNoticeType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : vinculoNoticeType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-teal-200 bg-teal-50 text-teal-800"
              }`}
            >
              {vinculoNotice}
            </div>
          )}

          <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                value={buscaInstituicao}
                onChange={(e) => setBuscaInstituicao(e.target.value)}
                placeholder="Buscar instituição por nome ou CNPJ"
                className="border-teal-200 bg-white"
              />
              <Button
                type="button"
                onClick={handleBuscarInstituicoesUsuario}
                disabled={isBuscandoInstituicoes || isVinculandoInstituicao}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                {isBuscandoInstituicoes ? "Buscando..." : "Buscar"}
              </Button>
            </div>

            {resultadosBuscaInstituicao.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {resultadosBuscaInstituicao.map((instituicao) => (
                  <div
                    key={instituicao.id}
                    className="flex flex-col gap-3 rounded-lg border border-teal-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-teal-900">{instituicao.nome}</p>
                      <p className="text-sm text-teal-700">CNPJ: {instituicao.cnpj}</p>
                      <p className="text-xs text-teal-600">
                        {instituicao.cidade} / {instituicao.estado} · {instituicao.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-teal-700 hover:bg-teal-800 text-white"
                      disabled={isVinculandoInstituicao}
                      onClick={() => handleVincularInstituicao(instituicao.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Tornar membro
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                          disabled={isUpdatingUser || isVinculandoInstituicao}
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
                          disabled={isUpdatingUser || isVinculandoInstituicao}
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
                          disabled={isUpdatingUser || isVinculandoInstituicao}
                          onClick={() => handleUserVinculoAction(vinculo.id, "rejeitar")}
                        >
                          Rejeitar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-slate-700 hover:bg-slate-800 text-white"
                        disabled={isUpdatingUser || isVinculandoInstituicao}
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
    </>
  );
}