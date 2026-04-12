import { useState } from "react";
import { Link, useNavigate } from "react-router";
import logoGeras from "../../imports/geras.png";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export function CadastrarInstituicaoPage() {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    nomeInstituicao: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    descricao: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simular cadastro de instituição
    localStorage.setItem("instituicao", JSON.stringify(formData));
    setShowSuccessModal(true);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logoGeras} alt="Geras" className="h-16 mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl text-teal-900">Cadastrar Instituição</h1>
          <p className="text-teal-700 mt-2">
            Preencha os dados da sua instituição
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-teal-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="nomeInstituicao" className="text-teal-900">
                  Nome da Instituição
                </Label>
                <Input
                  id="nomeInstituicao"
                  name="nomeInstituicao"
                  type="text"
                  value={formData.nomeInstituicao}
                  onChange={handleChange}
                  placeholder="Lar dos Idosos São José"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cnpj" className="text-teal-900">
                  CNPJ
                </Label>
                <Input
                  id="cnpj"
                  name="cnpj"
                  type="text"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefone" className="text-teal-900">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(47) 99999-9999"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="endereco" className="text-teal-900">
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  name="endereco"
                  type="text"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Rua das Flores, 123"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cidade" className="text-teal-900">
                  Cidade
                </Label>
                <Input
                  id="cidade"
                  name="cidade"
                  type="text"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Blumenau"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="estado" className="text-teal-900">
                  Estado
                </Label>
                <Input
                  id="estado"
                  name="estado"
                  type="text"
                  value={formData.estado}
                  onChange={handleChange}
                  placeholder="SC"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cep" className="text-teal-900">
                  CEP
                </Label>
                <Input
                  id="cep"
                  name="cep"
                  type="text"
                  value={formData.cep}
                  onChange={handleChange}
                  placeholder="89000-000"
                  className="mt-2 border-teal-200 focus:border-teal-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="descricao" className="text-teal-900">
                  Descrição da Instituição
                </Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Conte um pouco sobre a história e missão da instituição..."
                  className="mt-2 border-teal-200 focus:border-teal-500 min-h-[120px]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 py-6 text-lg"
            >
              Finalizar Cadastro
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/dashboard" className="text-teal-700 hover:text-teal-900">
            ← Voltar
          </Link>
        </div>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl text-teal-900">Solicitação Enviada!</DialogTitle>
              <DialogDescription className="text-base text-teal-700 pt-4">
                Sua inscrição foi submetida ao moderador do Geras, que irá avaliar os dados e aprovar caso esteja tudo correto.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                className="w-full bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900"
                onClick={handleCloseModal}
              >
                Ir para o Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}