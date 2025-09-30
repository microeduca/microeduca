-- Set password 'admin' for selected users
UPDATE public.profiles
SET password_hash = '$2b$10$TFZWd.koRV3tw2OE4tBHn.nzfBWs4I.6PYxvusT2JKbFJzisdAwqS', updated_at = now()
WHERE email IN ('admin@microeduca.com','joao@micro.com.br');


