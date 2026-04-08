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
]);