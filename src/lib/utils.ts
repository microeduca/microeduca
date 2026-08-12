import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Verifica se um item é um vídeo real (não PDF ou imagem)
 */
export const isActualVideo = (v: any): boolean => {
  const url = String(v?.videoUrl || '').toLowerCase();
  if ((v?.contentType || v?.content_type) === 'file') return false;
  // Se tem vimeoId ou vimeoEmbedUrl, é vídeo
  if (v.vimeoId || v.vimeoEmbedUrl) return true;
  // Se termina em .pdf ou é imagem, não é vídeo
  if (/\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(url)) return false;
  // Se inclui /api/files/, provavelmente é PDF ou material de apoio
  if (url.includes('/api/files/')) return false;
  // Se tem video_url mas não é PDF/imagem, considera como vídeo
  return !!v.videoUrl;
};

/**
 * Verifica se um item é material de apoio (PDF, etc)
 */
export const isSupportMaterial = (v: any): boolean => {
  const url = String(v?.videoUrl || '').toLowerCase();
  return (v?.contentType || v?.content_type) === 'file' || /\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(url) || url.includes('/api/files/');
};

export const formatDurationLong = (seconds: number): string => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0) parts.push(`${minutes}min`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
    return parts.join(' ');
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const formatDurationClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

/**
 * Soma vídeos e duração de um módulo incluindo todos os descendentes.
 * A contagem anterior somava só os vídeos presos diretamente ao módulo, o que
 * fazia uma pasta com subpastas aparecer como "0min" mesmo cheia de conteúdo.
 */
export const aggregateModuleContent = (
  moduleId: string,
  modules: Array<{ id: string; parentId?: string | null }>,
  videos: Array<{ moduleId?: string; module_id?: string; duration?: number }>
): { videos: number; duration: number } => {
  const filhosPorPai = new Map<string, string[]>();
  for (const m of modules) {
    const pai = m.parentId || '';
    if (!pai) continue;
    if (!filhosPorPai.has(pai)) filhosPorPai.set(pai, []);
    filhosPorPai.get(pai)!.push(m.id);
  }

  const ids = new Set<string>();
  const fila = [moduleId];
  while (fila.length) {
    const atual = fila.pop()!;
    if (ids.has(atual)) continue; // protege contra ciclos
    ids.add(atual);
    for (const filho of filhosPorPai.get(atual) || []) fila.push(filho);
  }

  let total = 0;
  let contagem = 0;
  for (const v of videos) {
    const mid = v.moduleId || v.module_id;
    if (mid && ids.has(mid)) {
      contagem += 1;
      total += Math.max(0, Number(v.duration) || 0);
    }
  }
  return { videos: contagem, duration: total };
};

export const isReleased = (item: any, now = new Date()): boolean => {
  const raw = item?.releaseAt || item?.release_at;
  if (!raw) return true;
  const releaseDate = new Date(raw);
  if (Number.isNaN(releaseDate.getTime())) return true;
  return releaseDate.getTime() <= now.getTime();
};

export const toDateTimeLocalValue = (value?: Date | string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const fromDateTimeLocalValue = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
