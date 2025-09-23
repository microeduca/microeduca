import { User, Category, Video, Comment, ViewHistory } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@edustream.com',
    role: 'admin',
    assignedCategories: [],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'user',
    assignedCategories: ['cat-1', 'cat-2'],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'user',
    assignedCategories: ['cat-2', 'cat-3'],
    createdAt: new Date('2024-01-20'),
  },
];

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Desenvolvimento Web',
    description: 'Aprenda as tecnologias mais modernas para criar aplicações web',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-2',
    name: 'Design UI/UX',
    description: 'Princípios de design e experiência do usuário',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'cat-3',
    name: 'Marketing Digital',
    description: 'Estratégias e técnicas de marketing online',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    createdAt: new Date('2024-01-01'),
  },
];

export const mockVideos: Video[] = [
  {
    id: 'vid-1',
    title: 'Introdução ao React',
    description: 'Aprenda os conceitos fundamentais do React e comece a criar suas primeiras aplicações',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    categoryId: 'cat-1',
    duration: 1800,
    uploadedBy: 'Admin User',
    uploadedAt: new Date('2024-01-05'),
  },
  {
    id: 'vid-2',
    title: 'TypeScript Avançado',
    description: 'Domine os recursos avançados do TypeScript',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
    categoryId: 'cat-1',
    duration: 2400,
    uploadedBy: 'Admin User',
    uploadedAt: new Date('2024-01-10'),
  },
  {
    id: 'vid-3',
    title: 'Princípios de Design',
    description: 'Fundamentos essenciais para criar interfaces bonitas e funcionais',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=800',
    categoryId: 'cat-2',
    duration: 1500,
    uploadedBy: 'Admin User',
    uploadedAt: new Date('2024-01-08'),
  },
  {
    id: 'vid-4',
    title: 'Figma para Iniciantes',
    description: 'Aprenda a usar o Figma do zero',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1602576666092-bf6447a729fc?w=800',
    categoryId: 'cat-2',
    duration: 2100,
    uploadedBy: 'Admin User',
    uploadedAt: new Date('2024-01-12'),
  },
  {
    id: 'vid-5',
    title: 'SEO Fundamentals',
    description: 'Otimize seu site para mecanismos de busca',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800',
    categoryId: 'cat-3',
    duration: 1800,
    uploadedBy: 'Admin User',
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