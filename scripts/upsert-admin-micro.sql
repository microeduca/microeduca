INSERT INTO public.profiles (email, name, role, assigned_categories, is_active, password_hash)
VALUES ('admin@micro.com.br', 'Administrador', 'admin', '{}', true, '$2b$10$TFZWd.koRV3tw2OE4tBHn.nzfBWs4I.6PYxvusT2JKbFJzisdAwqS')
ON CONFLICT (email) DO UPDATE
SET role = 'admin', is_active = true, password_hash = EXCLUDED.password_hash, updated_at = now();


