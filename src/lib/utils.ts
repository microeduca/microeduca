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
  // Se tem vimeoId ou vimeoEmbedUrl, é vídeo
  if (v.vimeoId || v.vimeoEmbedUrl) return true;
  // Se termina em .pdf ou é imagem, não é vídeo
  if (url.endsWith('.pdf') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return false;
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
  return url.endsWith('.pdf') || url.includes('/api/files/');
};
