
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { initErrorMonitoring } from "./lib/sentry";
  import "./styles/index.css";

  initErrorMonitoring();

  createRoot(document.getElementById("root")!).render(<App />);
  