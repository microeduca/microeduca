import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVideos from "./pages/AdminVideos";
import AdminCategories from "./pages/AdminCategories";
import MeusCursos from "./pages/MeusCursos";
import UserDashboard from "./pages/UserDashboard";
import VideoPlayer from "./pages/VideoPlayer";
import AdminUsers from "./pages/AdminUsers";
import VimeoUpload from "./components/admin/VimeoUpload";
import History from "./pages/History";

const queryClient = new QueryClient();

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
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/vimeo-upload" element={<VimeoUpload />} />
          <Route path="/admin/vimeo-callback" element={<VimeoUpload />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/meus-cursos" element={<MeusCursos />} />
          <Route path="/video/:videoId" element={<VideoPlayer />} />
          <Route path="/history" element={<History />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
