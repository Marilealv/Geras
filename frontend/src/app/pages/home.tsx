import { Link } from "react-router";
import { Heart } from "lucide-react";
import logoGeras from "../../imports/geras.png";
import elderlyHandsFlower from "../../imports/elderly-hands-flower.jpg";
import { Button } from "../components/ui/button";
import { Footer } from "../components/footer";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-teal-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/">
              <img src={logoGeras} alt="Geras" className="h-12 mix-blend-multiply" />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#inicio" className="text-teal-900 hover:text-teal-700 transition">
              Início
            </a>
            <a href="#sobre" className="text-teal-900 hover:text-teal-700 transition">
              Sobre
            </a>
            <Link to="/instituicoes" className="text-teal-900 hover:text-teal-700 transition">
              Instituições
            </Link>
          </nav>
          <Link to="/login">
            <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24" id="inicio">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-teal-900 mb-6">
              Vamos juntos trazer novos{" "}
              <span className="text-[#E88080]">sorrisos</span>
            </h1>
            <p className="text-lg text-teal-800 mb-8">
              O Geras busca auxiliar no caminho de doações para asilos da região,
              atuando como um mediador entre a relação doador-donatário, e auxiliando
              a reconhecer as necessidades e particularidades de cada instituição.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/registro">
                <Button className="bg-[#F7C672] hover:bg-[#f5b85a] text-teal-900 px-8 py-6 text-lg">
                  Cadastrar Instituição
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-teal-700 text-teal-900 hover:bg-teal-50 px-8 py-6 text-lg"
              >
                Saiba Mais
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-teal-100 to-rose-100 rounded-3xl p-8 shadow-xl overflow-hidden">
              <img
                src={elderlyHandsFlower}
                alt="Idosos felizes"
                className="rounded-2xl w-full h-[400px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-lg border-2 border-teal-600">
              <Heart className="w-12 h-12 text-[#E88080] fill-[#E88080]" />
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section className="bg-white py-16" id="sobre">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl text-teal-900 mb-6">Sobre Nós</h2>
            <p className="text-lg text-teal-800 mb-8">
              O Geras é uma plataforma web que conecta doadores e idosos, oferecendo um
              espaço para que necessidades reais sejam reconhecidas e atendidas de forma
              mais humana e personalizada.
            </p>
            <p className="text-lg text-teal-800">
              Diferentemente de iniciativas tradicionais de doação, a proposta do Geras é
              pôr em foco os gostos e particularidades de cada idoso. Seja um objeto
              especial, um produto de necessidade, ou até mesmo um gesto, como: uma
              companhia, uma conversa ou um abraço.
            </p>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-16 bg-gradient-to-br from-teal-50 to-rose-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl text-teal-900 mb-12 text-center">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#E88080] text-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl mb-4">Itens Urgentes</h3>
              <p className="text-lg">
                Os urgentes correspondem a produtos de beleza e cuidados pessoais, que
                são fundamentais para o dia a dia dos idosos, e muitas vezes caem em
                falta em asilos de baixa receita mensal.
              </p>
            </div>
            <div className="bg-teal-700 text-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl mb-4">Itens Desejados</h3>
              <p className="text-lg">
                Enquanto os desejados correspondem à motivação maior do Geras: aquilo que
                cada idoso deseja: presentes de aniversário, visitas, mensagens afetivas,
                entre outros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}