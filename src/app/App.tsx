import { useThemeInit } from "@/hooks/useTheme"
import { AppRoutes } from "@/app/routes"

export default function App() {
  useThemeInit()
  return <AppRoutes />
}