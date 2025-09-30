-- Set password 'admin' for selected users
UPDATE public.profiles
SET password_hash = '$2b$10$8BVzOwJyZnUOwRfbf5llwuTOz8B1N4A/61fFnm1cYthCbulCG9hxK', updated_at = now()
WHERE email IN ('admin@micro.com.br','admin@microeduca.com','joao@micro.com.br');


