-- Tabela de módulos hierárquicos (Categoria -> Módulo -> Submódulo)
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_modules_category_id ON public.modules(category_id);
CREATE INDEX IF NOT EXISTS idx_modules_parent_id ON public.modules(parent_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_modules_updated_at') THEN
    CREATE TRIGGER update_modules_updated_at
      BEFORE UPDATE ON public.modules
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Adicionar coluna module_id em videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_videos_module_id ON public.videos(module_id);

-- RLS (mesma lógica de categorias/vídeos: leitura pública temporária)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modules' AND policyname = 'Temporário - Ver módulos'
  ) THEN
    CREATE POLICY "Temporário - Ver módulos"
      ON public.modules FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modules' AND policyname = 'Temporário - Criar módulos'
  ) THEN
    CREATE POLICY "Temporário - Criar módulos"
      ON public.modules FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modules' AND policyname = 'Temporário - Atualizar módulos'
  ) THEN
    CREATE POLICY "Temporário - Atualizar módulos"
      ON public.modules FOR UPDATE
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modules' AND policyname = 'Temporário - Deletar módulos'
  ) THEN
    CREATE POLICY "Temporário - Deletar módulos"
      ON public.modules FOR DELETE
      USING (true);
  END IF;
END $$;

-- Backfill: criar módulo "Geral" por categoria para vídeos sem module_id
WITH cats AS (
  SELECT id FROM public.categories
), created AS (
  INSERT INTO public.modules (category_id, parent_id, title, description, "order")
  SELECT id, NULL, 'Geral', 'Módulo padrão', 0 FROM cats
  ON CONFLICT DO NOTHING
  RETURNING id, category_id
)
UPDATE public.videos v
SET module_id = m.id, updated_at = now()
FROM public.modules m
WHERE v.module_id IS NULL
  AND v.category_id = m.category_id
  AND m.title = 'Geral';


