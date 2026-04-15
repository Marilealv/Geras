import { CheckCircle, Edit, Plus } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface Necessidade {
  id: number;
  item: string;
  tipo: "urgente" | "desejado";
}

interface NecessidadesPanelProps {
  isEditMode: boolean;
  editingNecessidadeId: number | null;
  necessidadeItem: string;
  onNecessidadeItemChange: (value: string) => void;
  necessidadeTipo: "urgente" | "desejado";
  onNecessidadeTipoChange: (value: "urgente" | "desejado") => void;
  isSavingNecessidade: boolean;
  necessidadeFeedback: string;
  urgentes: Necessidade[];
  desejados: Necessidade[];
  onSaveNecessidade: () => void;
  onResetNecessidadeForm: () => void;
  onEditNecessidade: (necessidade: Necessidade) => void;
  onConcluirNecessidade: (necessidadeId: number) => void;
}

export function NecessidadesPanel({
  isEditMode,
  editingNecessidadeId,
  necessidadeItem,
  onNecessidadeItemChange,
  necessidadeTipo,
  onNecessidadeTipoChange,
  isSavingNecessidade,
  necessidadeFeedback,
  urgentes,
  desejados,
  onSaveNecessidade,
  onResetNecessidadeForm,
  onEditNecessidade,
  onConcluirNecessidade,
}: NecessidadesPanelProps) {
  return (
    <div className="space-y-6">
      {isEditMode && (
        <Card className="border-teal-200 bg-white">
          <CardHeader>
            <CardTitle className="text-teal-900 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingNecessidadeId ? "Editar necessidade" : "Adicionar item desejado/necessidade"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <Input
                value={necessidadeItem}
                onChange={(e) => onNecessidadeItemChange(e.target.value)}
                placeholder="Descreva o item ou pedido"
                className="border-teal-200"
              />
              <select
                value={necessidadeTipo}
                onChange={(e) => onNecessidadeTipoChange(e.target.value as "urgente" | "desejado")}
                className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-teal-900"
              >
                <option value="urgente">Urgente</option>
                <option value="desejado">Desejado</option>
              </select>
              <Button
                type="button"
                onClick={onSaveNecessidade}
                disabled={isSavingNecessidade}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {isSavingNecessidade ? "Salvando..." : editingNecessidadeId ? "Salvar" : "Adicionar"}
              </Button>
            </div>

            {editingNecessidadeId && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResetNecessidadeForm}
                  className="border-teal-300 text-teal-900 hover:bg-teal-50"
                >
                  Cancelar edição
                </Button>
              </div>
            )}

            {necessidadeFeedback && (
              <p className="text-sm text-teal-700" role="status">
                {necessidadeFeedback}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {urgentes.length > 0 && (
          <Card className="border-[#E88080] bg-[#E88080]/5">
            <CardHeader>
              <CardTitle className="text-teal-900">Itens Urgentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-teal-700 mb-4">
                Produtos de beleza e cuidados pessoais fundamentais para o dia a dia
              </p>
              <div className="space-y-3">
                {urgentes.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#E88080] bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="bg-[#E88080] text-white border-[#E88080] mb-2">
                          Urgente
                        </Badge>
                        <p className="text-teal-900 break-words">{item.item}</p>
                      </div>
                      {isEditMode && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditNecessidade(item)}
                            className="border-teal-300 text-teal-900 hover:bg-teal-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onConcluirNecessidade(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isSavingNecessidade}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {desejados.length > 0 && (
          <Card className="border-teal-600 bg-teal-600/5">
            <CardHeader>
              <CardTitle className="text-teal-900">Itens Desejados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-teal-700 mb-4">Presentes, visitas e gestos que trazem alegria</p>
              <div className="space-y-3">
                {desejados.map((item) => (
                  <div key={item.id} className="rounded-lg border border-teal-600 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="bg-teal-600 text-white border-teal-600 mb-2">
                          Desejado
                        </Badge>
                        <p className="text-teal-900 break-words">{item.item}</p>
                      </div>
                      {isEditMode && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditNecessidade(item)}
                            className="border-teal-300 text-teal-900 hover:bg-teal-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onConcluirNecessidade(item.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isSavingNecessidade}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}