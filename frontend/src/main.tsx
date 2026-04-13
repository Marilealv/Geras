import ReactDOM from "react-dom/client";
import App from "./app/App";
import { hydrateAuthSessionFromToken } from "./app/lib/auth";
import "./styles/index.css";

hydrateAuthSessionFromToken();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);
