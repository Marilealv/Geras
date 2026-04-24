import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/home";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { DashboardPage } from "./pages/dashboard";
import { CadastrarIdosoPage } from "./pages/cadastrar-idoso";
import { CadastrarInstituicaoPage } from "./pages/cadastrar-instituicao";
import { PerfilIdosoPage } from "./pages/perfil-idoso";
import { InstituicoesPage } from "./pages/instituicoes";
import { ModeradorPage } from "./pages/moderador";
import { TrocarSenhaPage } from "./pages/trocar-senha";
import { EsqueciSenhaPage } from "./pages/esqueci-senha";
import { RedefinirSenhaPage } from "./pages/redefinir-senha";
import { VerificarEmailPage } from "./pages/verificar-email";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/esqueci-senha",
    Component: EsqueciSenhaPage,
  },
  {
    path: "/redefinir-senha",
    Component: RedefinirSenhaPage,
  },
  {
    path: "/verificar-email",
    Component: VerificarEmailPage,
  },
  {
    path: "/registro",
    Component: RegisterPage,
  },
  {
    path: "/dashboard",
    Component: DashboardPage,
  },
  {
    path: "/cadastrar-idoso",
    Component: CadastrarIdosoPage,
  },
  {
    path: "/cadastrar-instituicao",
    Component: CadastrarInstituicaoPage,
  },
  {
    path: "/perfil-idoso/:id",
    Component: PerfilIdosoPage,
  },
  {
    path: "/instituicoes",
    Component: InstituicoesPage,
  },
  {
    path: "/moderador",
    Component: ModeradorPage,
  },
  {
    path: "/trocar-senha",
    Component: TrocarSenhaPage,
  },
]);