import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "./components/Layout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

// VentureSight AI Pages
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DealFlow from "./pages/DealFlow.tsx";
import DeckAnalysis from "./pages/DeckAnalysis.tsx";
import Chat from "./pages/Chat.tsx";

import "./index.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/*"
                element={
                  <Layout>
                    <Routes>
                      {/* VentureSight AI Routes */}
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/dealflow" element={<DealFlow />} />
                      <Route path="/deck/:deckId" element={<DeckAnalysis />} />
                      <Route path="/associate" element={<Chat />} />

                      {/* Default */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
