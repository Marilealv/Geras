import { useState } from "react";
import { Link, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Plus, X } from "lucide-react";

interface Necessidade {
  id: string;
  item: string;
  tipo: "urgente" | "desejado";
}

export function CadastrarIdosoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nome: "",
    idade: "",
    dataAniversario: "",
    fotoUrl: "",
    historia: "",
    hobbies: "",
    musicaFavorita: "",
    comidaFavorita: "",
  });

  const [necessidades, setNecessidades] = useState<Necessidade[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [tipoItem, setTipoItem] = useState<"urgente" | "desejado">("urgente");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddNecessidade = () => {
    if (!novoItem.trim()) return;

    setNecessidades([
      ...necessidades,
      {
        id: Date.now().toString(),
        item: novoItem,
        tipo: tipoItem,
      },
    ]);
    setNovoItem("");
  };

  const handleRemoveNecessidade = (id: string) => {
    setNecessidades(necessidades.filter((n) => n.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salvar idoso
    const novoIdoso = {
      id: Date.now().toString(),
      nome: formData.nome,
      idade: parseInt(formData.idade),
      dataAniversario: formData.dataAniversario,
      foto: formData.fotoUrl,
      historia: formData.historia,
      hobbies: formData.hobbies,
      musicaFavorita: formData.musicaFavorita,
      comidaFavorita: formData.comidaFavorita,
      necessidades: necessidades,
    };

    // Recuperar idosos existentes
    const idososExistentes = JSON.parse(
      localStorage.getItem("idosos") || "[]"
    );
    idososExistentes.push(novoIdoso);
    localStorage.setItem("idosos", JSON.stringify(idososExistentes));

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/dashboard">
            <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl text-teal-900">Cadastrar Idoso</h1>
          <p className="text-teal-700 mt-2">
            Preencha as informações com carinho
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 1
                  ? "bg-teal-600 text-white"
                  : "bg-teal-100 text-teal-600"
              }`}
            >
              1
            </div>
            <div
              className={`w-24 h-1 ${
                step >= 2 ? "bg-teal-600" : "bg-teal-100"
              }`}
            />
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 2
                  ? "bg-teal-600 text-white"
                  : "bg-teal-100 text-teal-600"
              }`}
            >
              2
            </div>
            <div
              className={`w-24 h-1 ${
                step >= 3 ? "bg-teal-600" : "bg-teal-100"
              }`}
            />
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 3
                  ? "bg-teal-600 text-white"
                  : "bg-teal-100 text-teal-600"
              }`}
            >
              3
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-teal-700">
            <span>Dados Básicos</span>
            <span>História</span>
            <span>Necessidades</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Dados Básicos */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="nome" className="text-teal-900">
                    Nome Completo
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    type="text"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Maria Silva"
                    className="mt-2 border-teal-200 focus:border-teal-500"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="idade" className="text-teal-900">
                      Idade
                    </Label>
                    <Input
                      id="idade"
                      name="idade"
                      type="number"
                      value={formData.idade}
                      onChange={handleChange}
                      placeholder="75"
                      className="mt-2 border-teal-200 focus:border-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dataAniversario" className="text-teal-900">
                      Data de Aniversário
                    </Label>
                    <Input
                      id="dataAniversario"
                      name="dataAniversario"
                      type="date"
                      value={formData.dataAniversario}
                      onChange={handleChange}
                      className="mt-2 border-teal-200 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="fotoUrl" className="text-teal-900">
                    URL da Foto (opcional)
                  </Label>
                  <Input
                    id="fotoUrl"
                    name="fotoUrl"
                    type="url"
                    value={formData.fotoUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="mt-2 border-teal-200 focus:border-teal-500"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
                >
                  Próximo: História do Idoso
                </Button>
              </div>
            )}

            {/* Step 2: História */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="historia" className="text-teal-900">
                    História do Idoso
                  </Label>
                  <Textarea
                    id="historia"
                    name="historia"
                    value={formData.historia}
                    onChange={handleChange}
                    placeholder="Conte a história de vida, momentos especiais, características únicas..."
                    className="mt-2 border-teal-200 focus:border-teal-500 min-h-[150px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="hobbies" className="text-teal-900">
                    Hobbies e Interesses
                  </Label>
                  <Input
                    id="hobbies"
                    name="hobbies"
                    type="text"
                    value={formData.hobbies}
                    onChange={handleChange}
                    placeholder="Crochê, jardinagem, ouvir música..."
                    className="mt-2 border-teal-200 focus:border-teal-500"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="musicaFavorita" className="text-teal-900">
                      Música Favorita
                    </Label>
                    <Input
                      id="musicaFavorita"
                      name="musicaFavorita"
                      type="text"
                      value={formData.musicaFavorita}
                      onChange={handleChange}
                      placeholder="Aquarela - Toquinho"
                      className="mt-2 border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="comidaFavorita" className="text-teal-900">
                      Comida Favorita
                    </Label>
                    <Input
                      id="comidaFavorita"
                      name="comidaFavorita"
                      type="text"
                      value={formData.comidaFavorita}
                      onChange={handleChange}
                      placeholder="Bolo de fubá"
                      className="mt-2 border-teal-200 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-teal-700 text-teal-900 hover:bg-teal-50 py-6 text-lg"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
                  >
                    Próximo: Necessidades
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Necessidades */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-teal-900">
                    Adicionar Necessidades e Desejos
                  </Label>
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={novoItem}
                        onChange={(e) => setNovoItem(e.target.value)}
                        placeholder="Ex: Shampoo, Visita, Livro de receitas..."
                        className="border-teal-200 focus:border-teal-500"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNecessidade();
                          }
                        }}
                      />
                      <select
                        value={tipoItem}
                        onChange={(e) =>
                          setTipoItem(e.target.value as "urgente" | "desejado")
                        }
                        className="px-4 py-2 border border-teal-200 rounded-md focus:outline-none focus:border-teal-500"
                      >
                        <option value="urgente">Urgente</option>
                        <option value="desejado">Desejado</option>
                      </select>
                      <Button
                        type="button"
                        onClick={handleAddNecessidade}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Lista de necessidades */}
                    {necessidades.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Urgentes */}
                          <div>
                            <h3 className="text-sm font-medium text-teal-900 mb-2">
                              Urgentes
                            </h3>
                            {necessidades
                              .filter((n) => n.tipo === "urgente")
                              .map((necessidade) => (
                                <Card
                                  key={necessidade.id}
                                  className="mb-2 bg-[#E88080]/10 border-[#E88080]"
                                >
                                  <CardContent className="py-3 px-4 flex items-center justify-between">
                                    <span className="text-teal-900">
                                      {necessidade.item}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveNecessidade(necessidade.id)
                                      }
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>

                          {/* Desejados */}
                          <div>
                            <h3 className="text-sm font-medium text-teal-900 mb-2">
                              Desejados
                            </h3>
                            {necessidades
                              .filter((n) => n.tipo === "desejado")
                              .map((necessidade) => (
                                <Card
                                  key={necessidade.id}
                                  className="mb-2 bg-teal-600/10 border-teal-600"
                                >
                                  <CardContent className="py-3 px-4 flex items-center justify-between">
                                    <span className="text-teal-900">
                                      {necessidade.item}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveNecessidade(necessidade.id)
                                      }
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 border-teal-700 text-teal-900 hover:bg-teal-50 py-6 text-lg"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
                  >
                    Finalizar Cadastro
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/dashboard" className="text-teal-700 hover:text-teal-900">
            ← Voltar para Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}