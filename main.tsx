import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./app/globals.css";

// TEMPORÁRIO — simula sessão logada para dev (remover antes de subir pro cPanel)
if (!localStorage.getItem("allka_token")) {
  localStorage.setItem("allka_token", "dev-bypass-token");
}
if (!localStorage.getItem("simulatedUser")) {
  localStorage.setItem(
    "simulatedUser",
    JSON.stringify({
      id: 1,
      name: "Admin Dev",
      email: "admin@allka.com",
      role: "admin",
      accountType: "admin",
    }),
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
