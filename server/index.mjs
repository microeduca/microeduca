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

// Videos
app.get('/api/videos', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.videos ORDER BY created_at DESC');
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
      duration,
      uploaded_by,
      vimeo_id,
      vimeo_embed_url,
    } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO public.videos (title, description, video_url, thumbnail, category_id, duration, uploaded_by, uploaded_at, vimeo_id, vimeo_embed_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now(), $8, $9)
       RETURNING *`,
      [title, description, video_url, thumbnail, category_id, duration || 0, uploaded_by || 'admin', vimeo_id, vimeo_embed_url]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['title','description','video_url','thumbnail','category_id','duration','vimeo_id','vimeo_embed_url'];
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
    const { rows } = await pool.query('SELECT * FROM public.profiles ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (movido para o final do arquivo após todas as rotas /api)

app.post('/api/profiles', async (req, res) => {
  try {
    const { email, name, role = 'user', assigned_categories = [], is_active = true, password } = req.body || {};
    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }
    const { rows } = await pool.query(
      'INSERT INTO public.profiles (email, name, role, assigned_categories, is_active, password_hash) VALUES ($1,$2,$3,$4::uuid[],$5,$6) RETURNING *',
      [email, name, role, assigned_categories, is_active, password_hash]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['email','name','role','assigned_categories','is_active'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'assigned_categories') {
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
      return res.json(tokenData);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    console.error('vimeo-auth error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/vimeo-upload', async (req, res) => {
  try {
    const { accessToken, title, description, privacy } = req.body || {};
    const fileSize = req.headers['x-file-size'] || '0';
    const VIMEO_CLIENT_ID = String(process.env.VIMEO_CLIENT_ID || '').trim();
    const VIMEO_CLIENT_SECRET = String(process.env.VIMEO_CLIENT_SECRET || '').trim();
    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      },
      body: JSON.stringify({
        upload: { approach: 'tus', size: fileSize },
        name: title,
        description,
        privacy: privacy || {
          view: 'unlisted',
          embed: 'whitelist',
          download: false,
          add: false,
          comments: 'nobody'
        }
      })
    });
    if (!createResponse.ok) {
      const text = await createResponse.text();
      return res.status(400).json({ error: `Failed to create upload: ${text}` });
    }
    const videoData = await createResponse.json();
    const videoId = videoData.uri.split('/').pop();
    return res.json({
      uploadLink: videoData.upload.upload_link,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      videoData
    });
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


