import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { envError } from "./app/env";
import "./styles/index.css";

const root = createRoot(document.getElementById("root")!);

if (envError) {
  // Fail loudly instead of rendering an app that can't reach the backend.
  console.error(envError);
  root.render(
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-destructive">ElectroCRM isn't configured</h1>
      <p className="mt-2 text-sm">{envError}</p>
    </div>,
  );
} else {
  // Loaded only once config is valid, because the Supabase client is created
  // at import time.
  import("./app/App").then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
