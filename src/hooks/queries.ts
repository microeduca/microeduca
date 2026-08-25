import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  getVideos,
  getViewHistory,
  getModulesByCategories,
  getUsers,
  getWelcomeVideo,
  getDiasNovidade,
  DIAS_NOVIDADE_PADRAO,
} from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';

/**
 * Camada de cache do portal. Antes cada tela disparava suas próprias buscas
 * num useEffect: abrir o painel administrativo pedia /api/videos três vezes e
 * /api/modules uma vez por categoria. Com as chaves abaixo, telas diferentes
 * compartilham a mesma resposta e o carregamento fica observável.
 */
export const chaves = {
  categorias: ['categorias'] as const,
  videos: ['videos'] as const,
  perfis: ['perfis'] as const,
  historico: (userId?: string) => ['historico', userId ?? 'todos'] as const,
  modulos: (categoryIds: string[]) => ['modulos', [...categoryIds].sort().join(',')] as const,
  videoBoasVindas: (role: string) => ['video-boas-vindas', role] as const,
  diasNovidade: ['dias-novidade'] as const,
  avisos: (todos: boolean) => ['avisos', todos ? 'todos' : 'vigentes'] as const,
  mensagens: (userId?: string) => ['mensagens', userId ?? 'propria'] as const,
  threads: ['mensagens-threads'] as const,
  naoLidas: ['mensagens-nao-lidas'] as const,
};

const CINCO_MINUTOS = 5 * 60 * 1000;

export function useCategorias() {
  return useQuery({ queryKey: chaves.categorias, queryFn: getCategories, staleTime: CINCO_MINUTOS });
}

export function useVideos() {
  return useQuery({ queryKey: chaves.videos, queryFn: getVideos, staleTime: CINCO_MINUTOS });
}

export function usePerfis(habilitado = true) {
  return useQuery({
    queryKey: chaves.perfis,
    queryFn: getUsers,
    staleTime: CINCO_MINUTOS,
    enabled: habilitado,
  });
}

export function useHistorico(userId?: string) {
  return useQuery({
    queryKey: chaves.historico(userId),
    queryFn: () => getViewHistory(userId),
    staleTime: 60 * 1000,
  });
}

/** Uma única requisição para todas as categorias, em vez de uma por categoria. */
export function useModulos(categoryIds: string[]) {
  return useQuery({
    queryKey: chaves.modulos(categoryIds),
    queryFn: () => getModulesByCategories(categoryIds),
    staleTime: CINCO_MINUTOS,
    enabled: categoryIds.length > 0,
    placeholderData: (anterior) => anterior,
  });
}

export function useVideoBoasVindas(role: 'user' | 'cliente') {
  return useQuery({
    queryKey: chaves.videoBoasVindas(role),
    queryFn: () => getWelcomeVideo(role),
    staleTime: CINCO_MINUTOS,
  });
}

/** Prazo, em dias, que um conteúdo permanece marcado como "Novo". */
export function useDiasNovidade() {
  const q = useQuery({
    queryKey: chaves.diasNovidade,
    queryFn: getDiasNovidade,
    staleTime: CINCO_MINUTOS,
  });
  return q.data ?? DIAS_NOVIDADE_PADRAO;
}

/** Avisos: os vigentes para o usuário, ou todos quando admin está gerenciando. */
export function useAvisos(todos = false) {
  return useQuery({
    queryKey: chaves.avisos(todos),
    queryFn: () => api.getAnnouncements(todos),
    staleTime: 60 * 1000,
  });
}

/**
 * Chat assíncrono. Sem WebSocket: a conversa se atualiza por consulta
 * periódica, suficiente para o uso esperado (dúvida do colaborador, resposta
 * do RH) e sem exigir servidor de tempo real.
 */
const INTERVALO_CHAT = 10 * 1000;

export function useMensagens(userId?: string, ativo = true) {
  return useQuery({
    queryKey: chaves.mensagens(userId),
    queryFn: () => api.getMessages(userId),
    refetchInterval: ativo ? INTERVALO_CHAT : false,
    enabled: ativo,
  });
}

export function useThreads(ativo = true) {
  return useQuery({
    queryKey: chaves.threads,
    queryFn: () => api.getMessageThreads(),
    refetchInterval: ativo ? INTERVALO_CHAT : false,
    enabled: ativo,
  });
}

/** Contador do menu; intervalo maior porque é só um indicador. */
export function useNaoLidas() {
  const q = useQuery({
    queryKey: chaves.naoLidas,
    queryFn: () => api.getUnreadCount(),
    refetchInterval: 30 * 1000,
  });
  return Number(q.data?.nao_lidas || 0);
}

/** Invalida os dados de conteúdo após uma alteração administrativa. */
export function useInvalidarConteudo() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: chaves.categorias });
    qc.invalidateQueries({ queryKey: chaves.videos });
    qc.invalidateQueries({ queryKey: ['modulos'] });
  };
}

/** Dados compartilhados pelos painéis de usuário e de cliente. */
export function useDadosDoPortal(role: 'user' | 'cliente') {
  const user = getCurrentUser();
  const categorias = useCategorias();
  const videos = useVideos();
  const historico = useHistorico(user?.id);
  const boasVindas = useVideoBoasVindas(role);

  const idsPermitidos = (user?.assignedCategories || []).filter(Boolean);
  const modulos = useModulos(idsPermitidos);

  return {
    user,
    categories: categorias.data ?? [],
    videos: videos.data ?? [],
    viewHistory: historico.data ?? [],
    welcomeVideo: boasVindas.data ?? null,
    modulesByCategory: modulos.data ?? {},
    isLoading: categorias.isLoading || videos.isLoading || historico.isLoading,
    isFetching: categorias.isFetching || videos.isFetching || modulos.isFetching,
  };
}
