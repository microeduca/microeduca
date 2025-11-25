-- Adicionar coluna order na tabela videos para permitir ordenação customizada
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Criar índice para melhorar performance nas consultas ordenadas
CREATE INDEX IF NOT EXISTS idx_videos_order ON public.videos("order");

-- Atualizar vídeos existentes para ter ordem baseada na data de upload
-- (ordem crescente: vídeos mais antigos primeiro)
UPDATE public.videos
SET "order" = sub.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY uploaded_at ASC) as row_num
  FROM public.videos
) sub
WHERE public.videos.id = sub.id;


