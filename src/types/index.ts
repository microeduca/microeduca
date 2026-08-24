export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'cliente';
  assignedCategories: string[];
  assignedModules?: string[];
  createdAt: Date;
  isActive?: boolean;
  /** Classificação do colaborador, independente do perfil de permissão. */
  userGroup?: 'em_treinamento' | 'efetivo' | null;
  /** Liberação programada individual, por categoria ou módulo. */
  scheduledAccess?: Array<{ scope_type: 'category' | 'module'; scope_id: string; release_at: string | null }>;
}

export interface SupportFile {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size?: number;
}

export type GrupoUsuario = 'em_treinamento' | 'efetivo';

/** Rótulos exibidos ao usuário para cada grupo. */
export const ROTULO_GRUPO: Record<GrupoUsuario, string> = {
  em_treinamento: 'Em treinamento',
  efetivo: 'Efetivo',
};

export interface Category {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createdAt: Date;
  releaseAt?: Date | null;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  thumbnail?: string;
  categoryId: string; // principal (compat)
  categoryIds?: string[]; // múltiplas categorias
  duration: number; // in seconds
  uploadedBy: string;
  uploadedAt: Date;
  vimeoId?: string;
  vimeoEmbedUrl?: string;
  moduleId?: string; // novo: vínculo ao módulo/submódulo
  supportFiles?: SupportFile[];
  releaseAt?: Date | null;
  contentType?: 'video' | 'file';
  /** Atividade da aula: quando true, exige link ou arquivo (itens a/b do 2º doc). */
  hasForm?: boolean;
  formUrl?: string | null;
  formFile?: SupportFile | null;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface ViewHistory {
  id?: string;
  userId: string;
  videoId: string;
  watchedDuration: number; // in seconds
  completed: boolean;
  lastWatchedAt: Date;
}

export interface VideoProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
}

export interface Module {
  id: string;
  categoryId: string;
  parentId?: string | null;
  title: string;
  description?: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  releaseAt?: Date | null;
  evaluationUrl?: string | null;
  children?: Module[];
}
