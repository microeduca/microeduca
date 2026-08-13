import { useDadosDoPortal } from '@/hooks/queries';

/**
 * Mantido como fachada para as telas que já o consumiam. A busca agora passa
 * pelo React Query: os dados são compartilhados entre telas e as chamadas
 * duplicadas — inclusive o N+1 de módulos por categoria — deixam de existir.
 */
export function useDashboardData(role: 'user' | 'cliente') {
  return useDadosDoPortal(role);
}
