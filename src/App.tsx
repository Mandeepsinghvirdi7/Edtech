import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./Contexts/ThemeContext";
import { ProtectedRoute } from "./Components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import TeamFlowchartPage from "./pages/TeamFlowchartPage";
import AdminUpload from "./pages/AdminUpload";
import AdminTeams from "./pages/AdminTeams";
import AdminDesignation from "./pages/AdminDesignation";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="dashboard-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/teams" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations', 'Vice President']}>
                  <TeamFlowchartPage />
                </ProtectedRoute>
              } />
              <Route path="/performance" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations', 'Vice President']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/upload" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations']}>
                  <AdminUpload />
                </ProtectedRoute>
              } />
              <Route path="/admin/teams" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations']}>
                  <AdminTeams />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations']}>
                  <AdminDesignation />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['Admin', 'Operations', 'Vice President']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
