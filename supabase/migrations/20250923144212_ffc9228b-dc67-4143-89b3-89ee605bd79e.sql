-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de vídeos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vimeo_id TEXT,
  vimeo_embed_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de usuários (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  assigned_categories UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de histórico de visualização
CREATE TABLE IF NOT EXISTS public.view_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_duration INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de progresso de vídeo
CREATE TABLE IF NOT EXISTS public.video_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  time_watched INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Criar funções para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON public.categories
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_videos_updated_at') THEN
    CREATE TRIGGER update_videos_updated_at
      BEFORE UPDATE ON public.videos
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_view_history_updated_at') THEN
    CREATE TRIGGER update_view_history_updated_at
      BEFORE UPDATE ON public.view_history
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN
    CREATE TRIGGER update_comments_updated_at
      BEFORE UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_progress_updated_at') THEN
    CREATE TRIGGER update_video_progress_updated_at
      BEFORE UPDATE ON public.video_progress
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias (público para leitura temporariamente)
CREATE POLICY "Categorias são públicas para leitura"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Permitir inserção de categorias"
  ON public.categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Temporário - Permitir atualização de categorias"
  ON public.categories FOR UPDATE
  USING (true);

CREATE POLICY "Temporário - Permitir deleção de categorias"
  ON public.categories FOR DELETE
  USING (true);

-- Políticas para vídeos (temporariamente público)
CREATE POLICY "Temporário - Vídeos visíveis para todos"
  ON public.videos FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Permitir inserção de vídeos"
  ON public.videos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Temporário - Permitir atualização de vídeos"
  ON public.videos FOR UPDATE
  USING (true);

CREATE POLICY "Temporário - Permitir deleção de vídeos"
  ON public.videos FOR DELETE
  USING (true);

-- Políticas para profiles (temporariamente público)
CREATE POLICY "Temporário - Profiles visíveis"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Permitir inserção de profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Temporário - Permitir atualização de profiles"
  ON public.profiles FOR UPDATE
  USING (true);

CREATE POLICY "Temporário - Permitir deleção de profiles"
  ON public.profiles FOR DELETE
  USING (true);

-- Políticas para histórico de visualização (temporariamente público)
CREATE POLICY "Temporário - Ver histórico"
  ON public.view_history FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Criar histórico"
  ON public.view_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Temporário - Atualizar histórico"
  ON public.view_history FOR UPDATE
  USING (true);

-- Políticas para comentários (temporariamente público)
CREATE POLICY "Temporário - Ver comentários"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Criar comentários"
  ON public.comments FOR INSERT
  WITH CHECK (true);

-- Políticas para progresso de vídeo (temporariamente público)
CREATE POLICY "Temporário - Ver progresso"
  ON public.video_progress FOR SELECT
  USING (true);

CREATE POLICY "Temporário - Criar progresso"
  ON public.video_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Temporário - Atualizar progresso"
  ON public.video_progress FOR UPDATE
  USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON public.videos(category_id);
CREATE INDEX IF NOT EXISTS idx_view_history_user_id ON public.view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_view_history_video_id ON public.view_history(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON public.video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON public.video_progress(video_id);

-- Inserir usuário admin padrão (se não existir)
INSERT INTO public.profiles (email, name, role)
VALUES ('admin@microeduca.com', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;