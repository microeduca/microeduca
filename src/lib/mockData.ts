import { User, Category, Video, Comment, ViewHistory } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@micro.com.br',
    role: 'admin',
    assignedCategories: [],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@micro.com.br',
    role: 'user',
    assignedCategories: ['cat-1', 'cat-2'],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@micro.com.br',
    role: 'user',
    assignedCategories: ['cat-2', 'cat-3'],
    createdAt: new Date('2024-01-20'),
  },
];

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Procedimentos Diagnósticos',
    description: 'Protocolos e técnicas para realização de exames diagnósticos',
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-2',
    name: 'Atendimento ao Paciente',
    description: 'Boas práticas e protocolos de atendimento',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-3',
    name: 'Biossegurança',
    description: 'Normas e procedimentos de segurança biológica',
    thumbnail: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    createdAt: new Date('2024-01-01'),
  },
];

export const mockVideos: Video[] = [
  {
    id: 'vid-1',
    title: 'Protocolo de Coleta de Sangue',
    description: 'Procedimento padrão para coleta de amostras sanguíneas',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    categoryId: 'cat-1',
    duration: 1800,
    uploadedBy: 'Administrador',
    uploadedAt: new Date('2024-01-05'),
  },
  {
    id: 'vid-2',
    title: 'Exames de Imagem - Raio-X',
    description: 'Técnicas e posicionamento para radiografias',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800',
    categoryId: 'cat-1',
    duration: 2400,
    uploadedBy: 'Administrador',
    uploadedAt: new Date('2024-01-10'),
  },
  {
    id: 'vid-3',
    title: 'Atendimento Humanizado',
    description: 'Práticas para um atendimento acolhedor e eficiente',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    categoryId: 'cat-2',
    duration: 1500,
    uploadedBy: 'Administrador',
    uploadedAt: new Date('2024-01-08'),
  },
  {
    id: 'vid-4',
    title: 'Protocolo de Emergência',
    description: 'Procedimentos de atendimento em situações de emergência',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800',
    categoryId: 'cat-2',
    duration: 2100,
    uploadedBy: 'Administrador',
    uploadedAt: new Date('2024-01-12'),
  },
  {
    id: 'vid-5',
    title: 'EPIs e Segurança',
    description: 'Uso correto de equipamentos de proteção individual',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    categoryId: 'cat-3',
    duration: 1800,
    uploadedBy: 'Administrador',
    uploadedAt: new Date('2024-01-07'),
  },
];

export const mockComments: Comment[] = [
  {
    id: 'com-1',
    videoId: 'vid-1',
    userId: '2',
    userName: 'João Silva',
    content: 'Excelente vídeo! Muito bem explicado.',
    createdAt: new Date('2024-01-06'),
  },
  {
    id: 'com-2',
    videoId: 'vid-1',
    userId: '3',
    userName: 'Maria Santos',
    content: 'Adorei a didática, parabéns!',
    createdAt: new Date('2024-01-07'),
  },
];

export const mockViewHistory: ViewHistory[] = [
  {
    id: 'view-1',
    userId: '2',
    videoId: 'vid-1',
    watchedDuration: 900,
    completed: false,
    lastWatchedAt: new Date('2024-01-20'),
  },
  {
    id: 'view-2',
    userId: '2',
    videoId: 'vid-3',
    watchedDuration: 1500,
    completed: true,
    lastWatchedAt: new Date('2024-01-21'),
  },
];