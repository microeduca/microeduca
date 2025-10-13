import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVideos from "./pages/AdminVideos";
import AdminCategories from "./pages/AdminCategories";
import AdminTaxonomy from "./pages/AdminTaxonomy";
import AdminModules from "./pages/AdminModules";
import MeusCursos from "./pages/MeusCursos";
import UserDashboard from "./pages/UserDashboard";
import UserDashboardCliente from "./pages/UserDashboardCliente";
import VideoPlayer from "./pages/VideoPlayer";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import AdminUserProfile from "./pages/AdminUserProfile";
import AdminVimeoUpload from "./pages/AdminVimeoUpload";
import AdminMaterialUpload from "./pages/AdminMaterialUpload";
import History from "./pages/History";

const queryClient = new QueryClient();

// Wrapper para forçar remontagem do VideoPlayer quando o ID mudar
const VideoPlayerWrapper = () => {
  const { videoId } = useParams();
  return <VideoPlayer key={videoId} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
          <Route path="/admin/categorias" element={<AdminCategories />} />
          <Route path="/admin/taxonomia" element={<AdminTaxonomy />} />
          <Route path="/admin/modulos" element={<AdminModules />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/vimeo-upload" element={<AdminVimeoUpload />} />
          <Route path="/admin/material-upload" element={<AdminMaterialUpload />} />
          <Route path="/admin/vimeo-callback" element={<AdminVimeoUpload />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/cliente" element={<UserDashboardCliente />} />
          <Route path="/meus-cursos" element={<MeusCursos />} />
          <Route path="/video/:videoId" element={<VideoPlayerWrapper />} />
          <Route path="/history" element={<History />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
