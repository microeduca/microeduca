import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pkg;

const PORT = process.env.PORT || 8787;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:iPisgVqCjjDYXTPPrhJUvDJvDBqzKcZQ@metro.proxy.rlwy.net:19989/railway';
// Vimeo: ler do ambiente; os endpoints abaixo obtêm os valores por requisição

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const app = express();
// Necessário em proxies (Railway) para que req.protocol reflita "https"
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Settings helpers to persist shared Vimeo OAuth token (for all admins)
async function ensureSettingsTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
  )`);
}
// ensure profiles has assigned_modules column
async function ensureProfilesAssignedModules() {
  try {
    await pool.query("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_modules uuid[] DEFAULT '{}' ");
  } catch {}
}
ensureProfilesAssignedModules().catch(() => {});

async function setSetting(key, value) {
  await ensureSettingsTable();
  await pool.query(
    `INSERT INTO public.settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

async function getSetting(key) {
  await ensureSettingsTable();
  const { rows } = await pool.query('SELECT value FROM public.settings WHERE key = $1 LIMIT 1', [key]);
  return rows[0]?.value || null;
}

// Ensure Modules schema exists (for environments without migrations applied)
async function ensureModulesSchema() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.modules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
      parent_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      "order" integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )`);
  } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_modules_category_id ON public.modules(category_id)'); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_modules_parent_id ON public.modules(parent_id)'); } catch {}
  try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL'); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_videos_module_id ON public.videos(module_id)'); } catch {}
}

// Ensure profiles.role allows 'cliente'
async function ensureProfilesRoleConstraint() {
  try {
    await pool.query('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check');
    await pool.query("ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','user','cliente'))");
  } catch {}
}
// Run in background on start
ensureProfilesRoleConstraint().catch(() => {});

// Files storage (PDF/JPG) in Postgres
async function ensureFilesTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.files (
    id text PRIMARY KEY,
    filename text NOT NULL,
    mime_type text NOT NULL,
    content bytea NOT NULL,
    size integer NOT NULL,
    created_at timestamptz DEFAULT now()
  )`);
}

import crypto from 'node:crypto';

app.post('/api/files', async (req, res) => {
  try {
    const { filename, mimeType, dataBase64 } = req.body || {};
    if (!filename || !mimeType || !dataBase64) return res.status(400).json({ error: 'Missing fields' });
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(mimeType)) return res.status(400).json({ error: 'Unsupported mimeType' });
    const buf = Buffer.from(String(dataBase64).split(',').pop(), 'base64');
    await ensureFilesTable();
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO public.files (id, filename, mime_type, content, size) VALUES ($1,$2,$3,$4,$5)', [id, filename, mimeType, buf, buf.length]);
    res.status(201).json({ id, filename, mimeType, size: buf.length, url: `/api/files/${id}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureFilesTable();
    const { rows } = await pool.query('SELECT * FROM public.files WHERE id = $1', [id]);
    const file = rows[0];
    if (!file) return res.status(404).end();
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    return res.send(Buffer.from(file.content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureFilesTable();
    await pool.query('DELETE FROM public.files WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generic settings API (used by Admin to configurar vídeos de boas-vindas)
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getSetting(key);
    res.json(value);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body || null;
    await setSetting(key, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function getSharedVimeoAccessToken() {
  const saved = await getSetting('vimeo_token');
  const token = saved?.access_token || process.env.VIMEO_ACCESS_TOKEN || null;
  return token;
}

// Diagnóstico seguro (pode remover após validar em produção)
app.get('/api/vimeo-config', (req, res) => {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  res.json({
    hasClientId: Boolean(process.env.VIMEO_CLIENT_ID && String(process.env.VIMEO_CLIENT_ID).trim()),
    hasClientSecret: Boolean(process.env.VIMEO_CLIENT_SECRET && String(process.env.VIMEO_CLIENT_SECRET).trim()),
    redirectUri: `${origin}/admin/vimeo-callback`
  });
});

// Simple auth endpoints (email + password)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await pool.query('SELECT * FROM public.profiles WHERE email = $1 LIMIT 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    // Se o usuário não possui senha definida ainda, definir agora (primeiro acesso)
    if (!user.password_hash && password) {
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE public.profiles SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, user.id]);
      user.password_hash = newHash;
    }
    if (!user.password_hash) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    // Return a minimal session (sem JWT, client-side)
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedCategories: user.assigned_categories || [],
      isActive: user.is_active,
      createdAt: user.created_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Categories
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.categories ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, thumbnail } = req.body || {};
    const { rows } = await pool.query(
      'INSERT INTO public.categories (name, description, thumbnail) VALUES ($1,$2,$3) RETURNING *',
      [name, description, thumbnail]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name','description','thumbnail'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`"${f}" = $${idx++}`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const sql = `UPDATE public.categories SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.categories WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Modules (hierárquico: category_id, parent_id)
app.get('/api/modules', async (req, res) => {
  try {
    await ensureModulesSchema();
    const { categoryId } = req.query;
    const params = [];
    let sql = 'SELECT * FROM public.modules';
    if (categoryId) {
      sql += ' WHERE category_id = $1';
      params.push(categoryId);
    }
    sql += ' ORDER BY "order", title';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/modules', async (req, res) => {
  try {
    await ensureModulesSchema();
    const { category_id, parent_id, title, description, order } = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO public.modules (category_id, parent_id, title, description, "order")
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [category_id, parent_id || null, title, description || null, Number.isFinite(order) ? order : 0]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/modules/:id', async (req, res) => {
  try {
    await ensureModulesSchema();
    const { id } = req.params;
    const fields = ['category_id','parent_id','title','description','order'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`"${f}" = $${idx++}`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const sql = `UPDATE public.modules SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/modules/:id', async (req, res) => {
  try {
    await ensureModulesSchema();
    const { id } = req.params;
    // Política de deleção: proíbe deletar se houver filhos ou vídeos vinculados
    const { rows: childRows } = await pool.query('SELECT 1 FROM public.modules WHERE parent_id = $1 LIMIT 1', [id]);
    if (childRows[0]) return res.status(400).json({ error: 'Módulo possui submódulos' });
    const { rows: videoRows } = await pool.query('SELECT 1 FROM public.videos WHERE module_id = $1 LIMIT 1', [id]);
    if (videoRows[0]) return res.status(400).json({ error: 'Módulo possui vídeos vinculados' });
    await pool.query('DELETE FROM public.modules WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Videos
app.get('/api/videos', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM public.videos 
      ORDER BY COALESCE("order", 0) ASC, uploaded_at ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const {
      title,
      description,
      video_url,
      thumbnail,
      category_id,
      category_ids,
      module_id,
      duration,
      uploaded_by,
      vimeo_id,
      vimeo_embed_url,
    } = req.body || {};

    // ensure optional array column exists
    try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_ids uuid[]'); } catch {}

    const order = req.body.order !== undefined ? req.body.order : null;
    const { rows } = await pool.query(
      `INSERT INTO public.videos (title, description, video_url, thumbnail, category_id, module_id, duration, uploaded_by, uploaded_at, vimeo_id, vimeo_embed_url, "order")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), $9, $10, $11)
       RETURNING *`,
      [title, description, video_url, thumbnail, category_id, module_id || null, duration || 0, uploaded_by || 'admin', vimeo_id, vimeo_embed_url, order]
    );
    const inserted = rows[0];
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      await pool.query('UPDATE public.videos SET category_ids = $1, updated_at = now() WHERE id = $2', [category_ids, inserted.id]);
    }
    const { rows: after } = await pool.query('SELECT * FROM public.videos WHERE id = $1', [inserted.id]);
    res.status(201).json(after[0] || inserted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // ensure optional array column exists
    try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_ids uuid[]'); } catch {}

    const fields = ['title','description','video_url','thumbnail','category_id','category_ids','module_id','duration','vimeo_id','vimeo_embed_url','order'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'category_ids') {
          updates.push(`"${f}" = $${idx++}::uuid[]`);
          values.push(req.body[f]);
        } else if (f === 'order') {
          updates.push(`"${f}" = $${idx++}`);
          values.push(req.body[f]);
        } else {
          updates.push(`"${f}" = $${idx++}`);
          values.push(req.body[f]);
        }
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const sql = `UPDATE public.videos SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.videos WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Profiles (Users)
app.get('/api/profiles', async (_req, res) => {
  try {
    await ensureProfilesAssignedModules();
    const { rows } = await pool.query('SELECT * FROM public.profiles ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (movido para o final do arquivo após todas as rotas /api)

app.post('/api/profiles', async (req, res) => {
  try {
    await ensureProfilesAssignedModules();
    const { email, name, role = 'user', assigned_categories = [], assigned_modules = [], is_active = true, password } = req.body || {};
    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }
    const { rows } = await pool.query(
      'INSERT INTO public.profiles (email, name, role, assigned_categories, assigned_modules, is_active, password_hash) VALUES ($1,$2,$3,$4::uuid[],$5::uuid[],$6,$7) RETURNING *',
      [email, name, role, assigned_categories, assigned_modules, is_active, password_hash]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureProfilesAssignedModules();
    const fields = ['email','name','role','assigned_categories','assigned_modules','is_active'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'assigned_categories' || f === 'assigned_modules') {
          updates.push(`"${f}" = $${idx++}::uuid[]`);
        } else {
          updates.push(`"${f}" = $${idx++}`);
        }
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const sql = `UPDATE public.profiles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.profiles WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Change password (user self-service)
app.post('/api/profiles/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Senha muito curta' });
    }
    const { rows } = await pool.query('SELECT id, password_hash FROM public.profiles WHERE id = $1 LIMIT 1', [id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.password_hash) {
      const ok = await bcrypt.compare(String(currentPassword || ''), user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    const newHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE public.profiles SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, id]);
    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vimeo OAuth-like endpoints (migramos das Edge Functions)
app.post('/api/vimeo-auth', async (req, res) => {
  try {
    const { action, code, state, refreshToken } = req.body || {};
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const VIMEO_CLIENT_ID = String(process.env.VIMEO_CLIENT_ID || '').trim();
    const VIMEO_CLIENT_SECRET = String(process.env.VIMEO_CLIENT_SECRET || '').trim();
    if (!VIMEO_CLIENT_ID || !VIMEO_CLIENT_SECRET) {
      return res.status(500).json({ error: 'VIMEO_CLIENT_ID e/ou VIMEO_CLIENT_SECRET não configurados no ambiente' });
    }

    if (action === 'getAuthUrl') {
      const redirectUri = `${origin}/admin/vimeo-callback`;
      const authUrl = `https://api.vimeo.com/oauth/authorize?response_type=code&client_id=${VIMEO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=upload+private+edit+delete`;
      return res.json({ authUrl });
    }

    if (action === 'exchangeToken') {
      const redirectUri = `${origin}/admin/vimeo-callback`;
      const tokenResponse = await fetch('https://api.vimeo.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${VIMEO_CLIENT_ID}:${VIMEO_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        },
        body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
      });
      if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        return res.status(400).json({ error: `Token exchange failed: ${text}` });
      }
      const tokenData = await tokenResponse.json();
      try { await setSetting('vimeo_token', tokenData); } catch {}
      return res.json(tokenData);
    }

    if (action === 'refreshToken') {
      const tokenResponse = await fetch('https://api.vimeo.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${VIMEO_CLIENT_ID}:${VIMEO_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken })
      });
      if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        return res.status(400).json({ error: `Token refresh failed: ${text}` });
      }
      const tokenData = await tokenResponse.json();
      try { await setSetting('vimeo_token', tokenData); } catch {}
      return res.json(tokenData);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    console.error('vimeo-auth error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint to check token status (expiry) for admin UI
app.get('/api/vimeo-token/status', async (_req, res) => {
  try {
    const saved = await getSetting('vimeo_token');
    const envToken = process.env.VIMEO_ACCESS_TOKEN && String(process.env.VIMEO_ACCESS_TOKEN).trim();
    const hasToken = !!(saved?.access_token || envToken);
    if (!hasToken) return res.json({ hasToken: false, expiresInDays: null, needsRefresh: true });

    // If using OAuth saved token, estimate expiry; for env token, no expiry
    if (saved?.access_token) {
      const createdAt = saved.created_at ? new Date(saved.created_at).getTime() : null;
      const ttlSec = Number(saved.expires_in || 0);
      if (createdAt && ttlSec > 0) {
        const nowSec = Date.now();
        const remainingMs = Math.max(0, (createdAt + ttlSec * 1000) - nowSec);
        const expiresInDays = Math.round(remainingMs / 86400000);
        const needsRefresh = remainingMs < 7 * 86400000;
        return res.json({ hasToken: true, expiresInDays, needsRefresh });
      }
    }
    // Env token case
    return res.json({ hasToken: true, expiresInDays: null, needsRefresh: false });
  } catch (e) {
    res.json({ hasToken: false, expiresInDays: null, needsRefresh: true });
  }
});

app.post('/api/vimeo-upload', async (req, res) => {
  try {
    const { accessToken, title, description, privacy } = req.body || {};
    const fileSize = req.headers['x-file-size'] || '0';
    const VIMEO_CLIENT_ID = String(process.env.VIMEO_CLIENT_ID || '').trim();
    const VIMEO_CLIENT_SECRET = String(process.env.VIMEO_CLIENT_SECRET || '').trim();
    // Enforce privacy default: hidden on Vimeo (unlisted) and embeddable anywhere
    const safePrivacy = {
      view: (privacy && privacy.view) || 'unlisted',
      embed: 'public',
      download: false,
      add: false,
      comments: 'nobody',
    };

    const token = accessToken || await getSharedVimeoAccessToken();
    if (!token) return res.status(401).json({ error: 'Vimeo token not configured' });

    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      },
      body: JSON.stringify({
        upload: { approach: 'tus', size: fileSize },
        name: title,
        description,
        privacy: safePrivacy
      })
    });
    if (!createResponse.ok) {
      const text = await createResponse.text();
      return res.status(400).json({ error: `Failed to create upload: ${text}` });
    }
    const videoData = await createResponse.json();
    const videoId = videoData.uri.split('/').pop();

    // Tentar obter a URL de embed oficial do Vimeo (inclui h= quando necessário para vídeos unlisted)
    let embedUrl = `https://player.vimeo.com/video/${videoId}`;
    try {
      const detailsResp = await fetch(`https://api.vimeo.com/videos/${encodeURIComponent(videoId)}?fields=player_embed_url,privacy,link`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        }
      });
      if (detailsResp.ok) {
        const details = await detailsResp.json();
        if (details?.player_embed_url) embedUrl = details.player_embed_url;
      }
    } catch {}

    return res.json({
      uploadLink: videoData.upload.upload_link,
      videoId,
      embedUrl,
      videoData
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook do Vimeo para atualizações de vídeo (pictures, duration, status)
app.post('/api/vimeo-webhook', async (req, res) => {
  try {
    const body = req.body || {};
    // Eventos comuns: video.transcoded, video.updated
    const videoUri = body?.data?.uri || body?.video?.uri || '';
    const videoId = videoUri.split('/').pop();
    if (!videoId) return res.status(200).json({ ok: true });

    // Buscar dados atuais do vídeo no Vimeo (pictures, duration, embed)
    const accessToken = String(process.env.VIMEO_WEBHOOK_ACCESS_TOKEN || '').trim();
    if (!accessToken) return res.status(200).json({ ok: true });

    const resp = await fetch(`https://api.vimeo.com/videos/${encodeURIComponent(videoId)}?fields=duration,pictures.sizes,player_embed_url`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      }
    });
    if (!resp.ok) return res.status(200).json({ ok: true });
    const data = await resp.json();
    const sizes = data?.pictures?.sizes || [];
    const best = Array.isArray(sizes) && sizes.length > 0
      ? sizes.filter(s => s?.link).sort((a, b) => (b.width || 0) - (a.width || 0))[0]
      : null;
    const thumbnail = best?.link || null;
    const duration = Number(data?.duration || 0) || 0;
    const embedUrl = data?.player_embed_url || null;

    // Atualizar no banco
    const fields = [];
    const values = [];
    let idx = 1;
    if (thumbnail) { fields.push(`thumbnail = $${idx++}`); values.push(thumbnail); }
    if (duration >= 0) { fields.push(`duration = $${idx++}`); values.push(duration); }
    if (embedUrl) { fields.push(`vimeo_embed_url = $${idx++}`); values.push(embedUrl); }
    if (fields.length > 0) {
      values.push(videoId);
      await pool.query(`UPDATE public.videos SET ${fields.join(', ')}, updated_at = now() WHERE vimeo_id = $${idx}`, values);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
});

// Recupera o melhor thumbnail atual de um vídeo no Vimeo
app.get('/api/vimeo-thumbnail/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const authHeader = req.headers['authorization'] || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    let accessToken = tokenFromHeader || String(req.query.accessToken || '');
    if (!accessToken) accessToken = await getSharedVimeoAccessToken();
    if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

    const resp = await fetch(`https://api.vimeo.com/videos/${encodeURIComponent(videoId)}?fields=duration,pictures.sizes,player_embed_url`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      }
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(400).json({ error: `Failed to fetch video: ${text}` });
    }
    const data = await resp.json();
    const sizes = data?.pictures?.sizes || [];
    const embedUrl = data?.player_embed_url || null;
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return res.json({ thumbnail: null, duration: Number(data?.duration || 0) || 0, embedUrl });
    }
    // Escolher a maior resolução disponível
    const best = sizes
      .filter(s => s?.link)
      .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    return res.json({ thumbnail: best?.link || null, duration: Number(data?.duration || 0) || 0, embedUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// View History
app.get('/api/view-history', async (req, res) => {
  try {
    const { userId } = req.query;
    const params = [];
    let sql = 'SELECT * FROM public.view_history';
    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }
    sql += ' ORDER BY last_watched_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// View History - recent with joins
app.get('/api/view-history/recent', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const { rows } = await pool.query(
      `SELECT vh.*, 
              p.name    AS user_name,
              v.title   AS video_title,
              v.thumbnail AS video_thumbnail,
              v.vimeo_id AS video_vimeo_id,
              v.video_url AS video_url,
              v.category_id AS video_category_id
       FROM public.view_history vh
       LEFT JOIN public.profiles p ON p.id = vh.user_id
       LEFT JOIN public.videos v   ON v.id = vh.video_id
       ORDER BY vh.last_watched_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/view-history', async (req, res) => {
  try {
    const { user_id, video_id, watched_duration, completed } = req.body || {};
    // Upsert by (user_id, video_id)
    const { rows } = await pool.query(
      `INSERT INTO public.view_history (user_id, video_id, watched_duration, completed, last_watched_at)
       VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id, video_id)
       DO UPDATE SET watched_duration = GREATEST(public.view_history.watched_duration, EXCLUDED.watched_duration), completed = public.view_history.completed OR EXCLUDED.completed, last_watched_at = now(), updated_at = now()
       RETURNING *`,
      [user_id, video_id, watched_duration || 0, !!completed]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Comments
app.get('/api/comments', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) return res.json([]);
    const { rows } = await pool.query(
      `SELECT c.*, p.name AS user_name
       FROM public.comments c
       LEFT JOIN public.profiles p ON p.id = c.user_id
       WHERE c.video_id = $1
       ORDER BY c.created_at DESC`,
      [videoId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { video_id, user_id, content } = req.body || {};
    const inserted = await pool.query(
      'INSERT INTO public.comments (video_id, user_id, content) VALUES ($1,$2,$3) RETURNING id',
      [video_id, user_id, content]
    );
    const id = inserted.rows[0]?.id;
    const { rows } = await pool.query(
      `SELECT c.*, p.name AS user_name
       FROM public.comments c
       LEFT JOIN public.profiles p ON p.id = c.user_id
       WHERE c.id = $1
       LIMIT 1`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.comments WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Video Progress
app.get('/api/video-progress', async (req, res) => {
  try {
    const { userId, videoId } = req.query;
    if (!userId || !videoId) return res.json(null);
    const { rows } = await pool.query(
      'SELECT * FROM public.video_progress WHERE user_id = $1 AND video_id = $2 LIMIT 1',
      [userId, videoId]
    );
    res.json(rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete video on Vimeo using shared token
app.delete('/api/vimeo/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const token = await getSharedVimeoAccessToken();
    if (!token) return res.status(401).json({ error: 'Vimeo token not configured' });
    const resp = await fetch(`https://api.vimeo.com/videos/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      }
    });
    if (resp.status === 204 || resp.status === 404) return res.status(204).end();
    const text = await resp.text();
    return res.status(400).json({ error: `Failed to delete: ${text}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Check token presence for admins
app.get('/api/vimeo-token', async (_req, res) => {
  try {
    const token = await getSharedVimeoAccessToken();
    res.json({ hasToken: !!token });
  } catch (e) {
    res.json({ hasToken: false });
  }
});

app.post('/api/video-progress', async (req, res) => {
  try {
    const { user_id, video_id } = req.body || {};
    const time_watched_raw = req.body?.time_watched ?? 0;
    const duration_raw = req.body?.duration ?? 0;
    const completed = !!req.body?.completed;
    const time_watched = Math.max(0, Math.floor(Number(time_watched_raw) || 0));
    const duration = Math.max(0, Math.floor(Number(duration_raw) || 0));
    const { rows } = await pool.query(
      `INSERT INTO public.video_progress (user_id, video_id, time_watched, duration, completed)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, video_id)
       DO UPDATE SET time_watched = GREATEST(public.video_progress.time_watched, EXCLUDED.time_watched), duration = GREATEST(public.video_progress.duration, EXCLUDED.duration), completed = public.video_progress.completed OR EXCLUDED.completed, updated_at = now()
       RETURNING *`,
      [user_id, video_id, time_watched, duration, completed]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

// --- Static frontend (serve React build) ---
// Em produção (Railway), servimos o build do Vite a partir de /dist
// As rotas que começam com /api foram todas definidas acima
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
// 404 JSON para rotas /api desconhecidas
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// Qualquer outra rota serve o index.html (SPA)
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});


