-- Script para corrigir inconsistências entre module_id e category_id em vídeos
-- Este script atualiza a category_id dos vídeos para corresponder à categoria do módulo
-- quando há inconsistência entre eles.

-- Atualizar category_id para corresponder à categoria do módulo
UPDATE public.videos v
SET 
  category_id = m.category_id,
  updated_at = now()
FROM public.modules m
WHERE v.module_id = m.id 
  AND v.category_id IS DISTINCT FROM m.category_id;

-- Atualizar category_ids para incluir a nova categoria principal
-- Preserva outras categorias se existirem, mas garante que a categoria do módulo esteja presente
UPDATE public.videos v
SET 
  category_ids = CASE 
    WHEN v.category_ids IS NULL OR array_length(v.category_ids, 1) IS NULL THEN
      ARRAY[m.category_id]
    WHEN NOT (m.category_id = ANY(v.category_ids)) THEN
      ARRAY[m.category_id] || v.category_ids
    ELSE
      v.category_ids
  END,
  updated_at = now()
FROM public.modules m
WHERE v.module_id = m.id 
  AND v.module_id IS NOT NULL;

-- Mostrar estatísticas dos vídeos corrigidos
SELECT 
  COUNT(*) as total_videos_corrigidos,
  COUNT(DISTINCT v.category_id) as categorias_afetadas
FROM public.videos v
INNER JOIN public.modules m ON v.module_id = m.id
WHERE v.category_id = m.category_id;
