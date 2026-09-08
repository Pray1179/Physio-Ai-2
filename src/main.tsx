import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "@/app/App"
import { AuthProvider } from "@/hooks/useAuth"
import { ToastProvider } from "@/components/ui/toast"
import "@/index.css"

// GitHub Pages serves the app from a subpath matching the repo name
// (e.g. /Physio-Ai-2/). Tell the router so /login -> /Physio-Ai-2/login.
// Matches vite.config.ts `base`.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)