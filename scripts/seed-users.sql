-- Admin padrão e um usuário exemplo (hash fraco apenas para dev)
INSERT INTO public.profiles (email, name, role, assigned_categories, is_active, password_hash)
VALUES
  ('admin@microeduca.com', 'Administrador', 'admin', '{}', true, '$2b$10$/2l9o8Qltx5jV1t3Qa/1.e1w1k6c9eZpS7e6K0s8qzLZr1kQ9eZ1O'),
  ('joao@micro.com.br', 'João da Silva', 'user', '{}', true, '$2b$10$/2l9o8Qltx5jV1t3Qa/1.e1w1k6c9eZpS7e6K0s8qzLZr1kQ9eZ1O')
ON CONFLICT (email) DO NOTHING;


