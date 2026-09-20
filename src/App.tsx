import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DataProvider } from "@/contexts/DataContext";
import { UserSettingsProvider } from "@/contexts/UserSettingsContext";
import { AIPreloadProvider } from "@/contexts/AIPreloadContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CohortAnalysis from "./pages/CohortAnalysis";
import InsightsIA from "./pages/InsightsIA";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DataProvider>
        <UserSettingsProvider>
          <AIPreloadProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  
                  {/* Protected App Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/cohort" element={
                    <ProtectedRoute>
                      <CohortAnalysis />
                    </ProtectedRoute>
                  } />
                  <Route path="/insights" element={
                    <ProtectedRoute>
                      <InsightsIA />
                    </ProtectedRoute>
                  } />
                  <Route path="/graficos" element={<Navigate to="/cohort" replace />} />
                  <Route path="/configuracoes" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  
                  {/* Redirects */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </AIPreloadProvider>
        </UserSettingsProvider>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
