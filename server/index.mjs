import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

const PORT = process.env.PORT || 8787;
const DATABASE_URL = process.env.DATABASE_URL;
// Vimeo: ler do ambiente; os endpoints abaixo obtêm os valores por requisição

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const app = express();
// Necessário em proxies (Railway) para que req.protocol reflita "https"
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Autenticação ---
// Sem JWT_SECRET definido a aplicação continua subindo, mas com um segredo
// efêmero: as sessões caem a cada restart. Defina a variável em produção.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET não definido — usando segredo efêmero. Sessões não sobrevivem a restart.');
}
const TOKEN_TTL = '12h';

const signToken = (user) => jwt.sign(
  { sub: user.id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: TOKEN_TTL }
);

// Rotas liberadas: health, login e o webhook do Vimeo (chamador externo).
const PUBLIC_PATHS = new Set(['/health', '/login', '/vimeo-webhook']);

// A LEITURA de um arquivo também é pública, e não por descuido: o navegador
// não envia Authorization em <img src>, <a href> ou window.open, então exigir
// token aqui deixaria todo PDF, imagem e material de apoio inacessível. O
// endereço é um UUID não adivinhável — mesma proteção de antes. Enviar e
// excluir continuam restritos a administrador.
const ehLeituraDeArquivo = (req) =>
  req.method === 'GET' && /^\/files\/[0-9a-fA-F-]{36}$/.test(req.path);

const authMiddleware = async (req, res, next) => {
  if (PUBLIC_PATHS.has(req.path) || ehLeituraDeArquivo(req)) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, name, role, assigned_categories, assigned_modules, is_active, user_group FROM public.profiles WHERE id = $1 LIMIT 1',
      [payload.sub]
    );
    const user = rows[0];
    // Revalida contra o banco: inativar ou rebaixar um usuário passa a ter
    // efeito imediato, sem esperar o token expirar.
    if (!user) return res.status(401).json({ error: 'Sessão inválida' });
    if (user.is_active === false) return res.status(403).json({ error: 'Usuário inativo' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada' });
  }
};

const GRUPOS_VALIDOS = new Set(['em_treinamento', 'efetivo']);

/** Grupo inválido é erro de quem chamou: 400, não 500 vindo da constraint. */
const grupoInvalido = (valor) =>
  valor !== undefined && valor !== null && valor !== '' && !GRUPOS_VALIDOS.has(valor);

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
  return next();
};

app.use('/api', authMiddleware);

app.get('/api/me', async (req, res) => {
  const u = req.user;
  let agendamentos = [];
  try {
    await ensureUserContentAccess();
    const { rows } = await pool.query(
      'SELECT scope_type, scope_id, release_at FROM public.user_content_access WHERE user_id = $1',
      [u.id]
    );
    agendamentos = rows;
  } catch { agendamentos = []; }
  res.json({
    scheduledAccess: agendamentos,
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    assignedCategories: u.assigned_categories || [],
    assignedModules: u.assigned_modules || [],
    isActive: u.is_active,
    userGroup: u.user_group || null,
  });
});

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
  // Classificação do colaborador, separada do perfil de permissão: alguém pode
  // ser 'user' e estar 'em_treinamento' ao mesmo tempo.
  try { await pool.query('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_group text'); } catch {}
  try { await pool.query("ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_group_check"); } catch {}
  try { await pool.query("ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_group_check CHECK (user_group IS NULL OR user_group IN ('em_treinamento','efetivo'))"); } catch {}
}
ensureProfilesAssignedModules().catch(() => {});

async function ensureContentEnhancementColumns() {
  try { await pool.query('ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS release_at timestamptz'); } catch {}
  try { await pool.query('ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS release_at timestamptz'); } catch {}
  try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS release_at timestamptz'); } catch {}
  try { await pool.query("ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS support_files jsonb NOT NULL DEFAULT '[]'::jsonb"); } catch {}
  try { await pool.query("ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video'"); } catch {}
  // Formulário/atividade por vídeo (itens a e b do segundo documento)
  try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS has_form boolean NOT NULL DEFAULT false'); } catch {}
  try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS form_url text'); } catch {}
  try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS form_file jsonb'); } catch {}
  // Grupos de usuário (item g do 2º documento). Vazio significa "todos", para
  // que o conteúdo já existente continue visível como sempre foi.
  try { await pool.query("ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS target_groups text[] DEFAULT '{}'"); } catch {}
  try { await pool.query("ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS target_groups text[] DEFAULT '{}'"); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_videos_release_at ON public.videos(release_at)'); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_modules_release_at ON public.modules(release_at)'); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_categories_release_at ON public.categories(release_at)'); } catch {}
}
ensureContentEnhancementColumns().catch(() => {});

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
  try { await pool.query('ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS release_at timestamptz'); } catch {}
  try { await pool.query('ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS evaluation_url text'); } catch {}
}

// Quadro de avisos (item g do 2º documento). O admin publica comunicados
// direcionados a um grupo — algo destinado aos efetivos não deve aparecer
// para quem ainda está em treinamento.
async function ensureAnnouncements() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.announcements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      body text NOT NULL,
      target_groups text[] NOT NULL DEFAULT '{}',
      starts_at timestamptz,
      ends_at timestamptz,
      created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_announcements_janela ON public.announcements(starts_at, ends_at)'); } catch {}
}
ensureAnnouncements().catch(() => {});

/** Avisos vigentes para quem está pedindo: respeita janela de datas e grupo. */
app.get('/api/announcements', async (req, res) => {
  try {
    await ensureAnnouncements();
    const admin = req.user.role === 'admin';
    if (admin && req.query.all === 'true') {
      const { rows } = await pool.query(
        'SELECT * FROM public.announcements ORDER BY created_at DESC');
      return res.json(rows);
    }
    const { rows } = await pool.query(`
      SELECT id, title, body, target_groups, starts_at, ends_at, created_at
        FROM public.announcements
       WHERE (starts_at IS NULL OR starts_at <= now())
         AND (ends_at   IS NULL OR ends_at   >= now())
         AND (COALESCE(array_length(target_groups,1),0) = 0
              OR $1::text = ANY(target_groups))
       ORDER BY created_at DESC
       LIMIT 20`, [req.user.user_group || '']);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function validarAviso(body) {
  if (!body?.title || !String(body.title).trim()) return 'Informe o título do aviso';
  if (!body?.body || !String(body.body).trim()) return 'Informe o texto do aviso';
  for (const g of (Array.isArray(body.target_groups) ? body.target_groups : [])) {
    if (!GRUPOS_VALIDOS.has(g)) return `Grupo inválido: ${g}`;
  }
  const d = (v) => v === null || v === undefined || v === '' || !Number.isNaN(new Date(v).getTime());
  if (!d(body.starts_at) || !d(body.ends_at)) return 'Data de exibição inválida';
  if (body.starts_at && body.ends_at && new Date(body.ends_at) < new Date(body.starts_at)) {
    return 'A data final não pode ser anterior à inicial';
  }
  return null;
}

app.post('/api/announcements', requireAdmin, async (req, res) => {
  try {
    await ensureAnnouncements();
    const erro = validarAviso(req.body);
    if (erro) return res.status(400).json({ error: erro });
    const { title, body, target_groups = [], starts_at = null, ends_at = null } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO public.announcements (title, body, target_groups, starts_at, ends_at, created_by)
       VALUES ($1,$2,$3::text[],$4,$5,$6) RETURNING *`,
      [String(title).trim(), String(body).trim(), Array.isArray(target_groups) ? target_groups : [],
       starts_at || null, ends_at || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/announcements/:id', requireAdmin, async (req, res) => {
  try {
    await ensureAnnouncements();
    const erro = validarAviso({ ...req.body, title: req.body.title ?? 'x', body: req.body.body ?? 'x' });
    if (erro) return res.status(400).json({ error: erro });
    const campos = ['title','body','target_groups','starts_at','ends_at'];
    const updates = []; const values = []; let idx = 1;
    for (const f of campos) {
      if (req.body[f] !== undefined) {
        updates.push(f === 'target_groups' ? `"${f}" = $${idx++}::text[]` : `"${f}" = $${idx++}`);
        values.push(f === 'target_groups' ? (Array.isArray(req.body[f]) ? req.body[f] : []) : (req.body[f] || null));
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE public.announcements SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Aviso não encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
  try {
    await ensureAnnouncements();
    await pool.query('DELETE FROM public.announcements WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Chat entre um usuário e a administração (item g do 2º documento). A conversa
// é sempre usuário <-> admin, então user_id identifica a thread e sender_id diz
// quem escreveu — qualquer admin pode responder, e a conversa não se perde se
// o administrador que respondeu sair da empresa.
async function ensureMessages() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      from_admin boolean NOT NULL DEFAULT false,
      body text NOT NULL,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(user_id, created_at)'); } catch {}
}
ensureMessages().catch(() => {});

/** Threads com a última mensagem e quantas aguardam resposta. Só admin. */
app.get('/api/messages/threads', requireAdmin, async (_req, res) => {
  try {
    await ensureMessages();
    const { rows } = await pool.query(`
      SELECT p.id AS user_id, p.name, p.email, p.user_group,
             count(*)                                                  AS total,
             count(*) FILTER (WHERE NOT m.from_admin AND m.read_at IS NULL) AS nao_lidas,
             max(m.created_at)                                         AS ultima_em,
             (SELECT body FROM public.messages m2
               WHERE m2.user_id = p.id ORDER BY m2.created_at DESC LIMIT 1) AS ultima_mensagem
        FROM public.messages m
        JOIN public.profiles p ON p.id = m.user_id
       GROUP BY p.id, p.name, p.email, p.user_group
       ORDER BY nao_lidas DESC, ultima_em DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Mensagens de uma conversa. Usuário comum só acessa a própria. */
app.get('/api/messages', async (req, res) => {
  try {
    await ensureMessages();
    const alvo = req.user.role === 'admin' ? (req.query.userId || req.user.id) : req.user.id;
    const { rows } = await pool.query(
      `SELECT m.id, m.user_id, m.sender_id, m.from_admin, m.body, m.read_at, m.created_at,
              p.name AS sender_name
         FROM public.messages m
         LEFT JOIN public.profiles p ON p.id = m.sender_id
        WHERE m.user_id = $1
        ORDER BY m.created_at ASC
        LIMIT 300`, [alvo]);
    // Abrir a conversa marca como lidas as mensagens do outro lado.
    await pool.query(
      `UPDATE public.messages SET read_at = now()
        WHERE user_id = $1 AND read_at IS NULL AND from_admin = $2`,
      [alvo, req.user.role !== 'admin']
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages', async (req, res) => {
  try {
    await ensureMessages();
    const texto = String(req.body?.body || '').trim();
    if (!texto) return res.status(400).json({ error: 'Escreva uma mensagem' });
    if (texto.length > 4000) return res.status(400).json({ error: 'Mensagem muito longa (máximo 4000 caracteres)' });

    const ehAdmin = req.user.role === 'admin';
    // O admin precisa dizer com quem fala; o usuário só pode falar na própria thread.
    const alvo = ehAdmin ? req.body?.userId : req.user.id;
    if (!alvo) return res.status(400).json({ error: 'Informe o usuário da conversa' });
    if (ehAdmin) {
      const { rows: existe } = await pool.query('SELECT 1 FROM public.profiles WHERE id = $1', [alvo]);
      if (!existe[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const { rows } = await pool.query(
      `INSERT INTO public.messages (user_id, sender_id, from_admin, body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [alvo, req.user.id, ehAdmin, texto]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Quantas mensagens novas o usuário tem, para o indicador no menu. */
app.get('/api/messages/unread', async (req, res) => {
  try {
    await ensureMessages();
    const ehAdmin = req.user.role === 'admin';
    const { rows } = await pool.query(
      ehAdmin
        ? 'SELECT count(*)::int AS n FROM public.messages WHERE NOT from_admin AND read_at IS NULL'
        : 'SELECT count(*)::int AS n FROM public.messages WHERE user_id = $1 AND from_admin AND read_at IS NULL',
      ehAdmin ? [] : [req.user.id]);
    res.json({ nao_lidas: rows[0]?.n || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Registro de acesso ao portal. O relatório antes usava a última visualização
// de conteúdo como "último acesso", então quem entrava e não assistia nada
// ficava invisível — é o item (a) do Dashboard no segundo documento.
async function ensureAccessLog() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.access_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      ip text,
      user_agent text
    )`);
  } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_access_log_user ON public.access_log(user_id)'); } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_access_log_when ON public.access_log(occurred_at)'); } catch {}
}
ensureAccessLog().catch(() => {});

/** Nunca deve derrubar o login: falha em registrar é apenas avisada no log. */
async function registrarAcesso(req, userId) {
  try {
    await ensureAccessLog();
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;
    const ua = String(req.headers['user-agent'] || '').slice(0, 400) || null;
    await pool.query(
      'INSERT INTO public.access_log (user_id, ip, user_agent) VALUES ($1,$2,$3)',
      [userId, ip, ua]
    );
  } catch (e) {
    console.warn('[acesso] não foi possível registrar:', e.message);
  }
}

// Liberação programada por usuário (item 3 do documento).
// O release_at das categorias/módulos é global; esta tabela adia o acesso de
// um usuário específico a um conteúdo que ele já tem concedido.
async function ensureUserContentAccess() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.user_content_access (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      scope_type text NOT NULL CHECK (scope_type IN ('category','module')),
      scope_id uuid NOT NULL,
      release_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (user_id, scope_type, scope_id)
    )`);
  } catch {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS idx_uca_user ON public.user_content_access(user_id)'); } catch {}
}
ensureUserContentAccess().catch(() => {});

app.get('/api/profiles/:id/access', requireAdmin, async (req, res) => {
  try {
    await ensureUserContentAccess();
    const { rows } = await pool.query(
      'SELECT scope_type, scope_id, release_at FROM public.user_content_access WHERE user_id = $1',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Substitui as regras do usuário de uma vez; entradas sem data são removidas.
app.put('/api/profiles/:id/access', requireAdmin, async (req, res) => {
  const cliente = await pool.connect();
  try {
    await ensureUserContentAccess();
    const regras = Array.isArray(req.body?.rules) ? req.body.rules : [];
    for (const r of regras) {
      if (!['category', 'module'].includes(r.scope_type)) {
        return res.status(400).json({ error: `scope_type inválido: ${r.scope_type}` });
      }
      if (r.release_at && Number.isNaN(new Date(r.release_at).getTime())) {
        return res.status(400).json({ error: 'release_at não é uma data válida' });
      }
    }
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM public.user_content_access WHERE user_id = $1', [req.params.id]);
    for (const r of regras) {
      if (!r.release_at) continue;
      await cliente.query(
        `INSERT INTO public.user_content_access (user_id, scope_type, scope_id, release_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, scope_type, scope_id)
         DO UPDATE SET release_at = EXCLUDED.release_at, updated_at = now()`,
        [req.params.id, r.scope_type, r.scope_id, r.release_at]
      );
    }
    await cliente.query('COMMIT');
    const { rows } = await cliente.query(
      'SELECT scope_type, scope_id, release_at FROM public.user_content_access WHERE user_id = $1',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    await cliente.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: e.message });
  } finally {
    cliente.release();
  }
});

// Ensure profiles.role allows 'cliente'
async function ensureProfilesRoleConstraint() {
  try {
    await pool.query('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check');
    await pool.query("ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','user','cliente'))");
  } catch {}
}
// Run in background on start
ensureProfilesRoleConstraint().catch(() => {});

// --- Armazenamento de arquivos ---
// Antes o conteúdo vivia em bytea: 88% do banco de produção eram blobs, sem
// streaming, sem cache e sem range requests. Agora o binário fica num volume
// e o banco guarda só os metadados. A coluna content continua existindo como
// origem para a migração e como fallback de leitura.
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

function garantirPastaDeUploads() {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    return true;
  } catch (e) {
    console.warn(`[files] volume indisponível em ${UPLOAD_DIR} (${e.code}); usando o banco`);
    return false;
  }
}
const VOLUME_OK = garantirPastaDeUploads();

const caminhoDoArquivo = (id) => path.join(UPLOAD_DIR, id);

async function ensureFilesStorageColumns() {
  try { await pool.query('ALTER TABLE public.files ADD COLUMN IF NOT EXISTS storage_path text'); } catch {}
  try { await pool.query('ALTER TABLE public.files ALTER COLUMN content DROP NOT NULL'); } catch {}
}

/**
 * Move para o volume os arquivos que ainda estão em bytea. Roda uma vez no
 * boot e é idempotente: só toca em linhas sem storage_path.
 */
async function migrarArquivosParaVolume() {
  if (!VOLUME_OK) return;
  try {
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const { rows } = await pool.query(
      'SELECT id FROM public.files WHERE storage_path IS NULL AND content IS NOT NULL'
    );
    if (rows.length === 0) return;
    console.log(`[files] migrando ${rows.length} arquivo(s) do banco para ${UPLOAD_DIR}`);
    let migrados = 0;
    for (const { id } of rows) {
      try {
        const { rows: r } = await pool.query('SELECT content FROM public.files WHERE id = $1', [id]);
        if (!r[0]?.content) continue;
        const destino = caminhoDoArquivo(id);
        fs.writeFileSync(destino, Buffer.from(r[0].content));
        await pool.query('UPDATE public.files SET storage_path = $1 WHERE id = $2', [destino, id]);
        migrados += 1;
      } catch (e) {
        console.warn(`[files] falha ao migrar ${id}: ${e.message}`);
      }
    }
    console.log(`[files] ${migrados}/${rows.length} arquivo(s) migrado(s)`);
  } catch (e) {
    console.warn(`[files] migração não executada: ${e.message}`);
  }
}
migrarArquivosParaVolume().catch(() => {});

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


app.post('/api/files', requireAdmin, async (req, res) => {
  try {
    const { filename, mimeType, dataBase64 } = req.body || {};
    if (!filename || !mimeType || !dataBase64) return res.status(400).json({ error: 'Missing fields' });
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (!allowed.includes(mimeType)) return res.status(400).json({ error: 'Unsupported mimeType' });
    const buf = Buffer.from(String(dataBase64).split(',').pop(), 'base64');
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const id = crypto.randomUUID();

    if (VOLUME_OK) {
      const destino = caminhoDoArquivo(id);
      fs.writeFileSync(destino, buf);
      await pool.query(
        'INSERT INTO public.files (id, filename, mime_type, size, storage_path) VALUES ($1,$2,$3,$4,$5)',
        [id, filename, mimeType, buf.length, destino]
      );
    } else {
      // Sem volume montado o comportamento antigo continua valendo.
      await pool.query(
        'INSERT INTO public.files (id, filename, mime_type, content, size) VALUES ($1,$2,$3,$4,$5)',
        [id, filename, mimeType, buf, buf.length]
      );
    }
    res.status(201).json({ id, filename, mimeType, size: buf.length, url: `/api/files/${id}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const { rows } = await pool.query(
      'SELECT id, filename, mime_type, size, storage_path FROM public.files WHERE id = $1', [id]);
    const file = rows[0];
    if (!file) return res.status(404).end();

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    // Conteúdo imutável: o id nunca é reaproveitado.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

    const noDisco = file.storage_path && fs.existsSync(file.storage_path);
    if (noDisco) {
      const total = fs.statSync(file.storage_path).size;
      res.setHeader('Accept-Ranges', 'bytes');
      // Range é o que permite ao leitor de PDF abrir páginas sem baixar tudo.
      const range = req.headers.range;
      const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const inicio = m[1] ? Number(m[1]) : 0;
        const fim = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
        if (Number.isNaN(inicio) || inicio > fim || inicio >= total) {
          res.setHeader('Content-Range', `bytes */${total}`);
          return res.status(416).end();
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${inicio}-${fim}/${total}`);
        res.setHeader('Content-Length', fim - inicio + 1);
        return fs.createReadStream(file.storage_path, { start: inicio, end: fim }).pipe(res);
      }
      res.setHeader('Content-Length', total);
      return fs.createReadStream(file.storage_path).pipe(res);
    }

    // Ainda no banco (antes da migração ou sem volume).
    const { rows: r } = await pool.query('SELECT content FROM public.files WHERE id = $1', [id]);
    if (!r[0]?.content) return res.status(404).end();
    return res.send(Buffer.from(r[0].content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/files/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const { rows } = await pool.query('SELECT storage_path FROM public.files WHERE id = $1', [id]);
    // Remove o binário antes do registro; sobrar arquivo sem linha é lixo invisível.
    if (rows[0]?.storage_path) {
      try { fs.unlinkSync(rows[0].storage_path); } catch { /* já não existe */ }
    }
    await pool.query('DELETE FROM public.files WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Diagnóstico do armazenamento, para o admin saber onde os arquivos estão.
app.get('/api/files-storage/status', requireAdmin, async (_req, res) => {
  try {
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const { rows } = await pool.query(`
      SELECT count(*)::int                                            AS total,
             count(*) FILTER (WHERE storage_path IS NOT NULL)::int     AS no_volume,
             count(*) FILTER (WHERE storage_path IS NULL)::int         AS no_banco,
             COALESCE(sum(size), 0)::bigint                            AS bytes
        FROM public.files`);
    res.json({ ...rows[0], volumeAtivo: VOLUME_OK, diretorio: UPLOAD_DIR });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove arquivos que nenhum vídeo referencia — uploads abandonados.
app.post('/api/files-storage/cleanup', requireAdmin, async (_req, res) => {
  try {
    await ensureFilesTable();
    await ensureFilesStorageColumns();
    const { rows } = await pool.query(`
      WITH usados AS (
        SELECT DISTINCT substring(video_url  from '/api/files/([0-9a-fA-F-]+)') AS id
          FROM public.videos WHERE video_url LIKE '%/api/files/%'
        UNION
        SELECT DISTINCT substring(thumbnail from '/api/files/([0-9a-fA-F-]+)')
          FROM public.videos WHERE thumbnail LIKE '%/api/files/%'
        UNION
        SELECT DISTINCT (sf ->> 'id')
          FROM public.videos v, jsonb_array_elements(COALESCE(v.support_files, '[]'::jsonb)) sf
      )
      SELECT f.id, f.storage_path FROM public.files f
       WHERE NOT EXISTS (SELECT 1 FROM usados u WHERE u.id = f.id)`);
    for (const r of rows) {
      if (r.storage_path) { try { fs.unlinkSync(r.storage_path); } catch { /* ausente */ } }
      await pool.query('DELETE FROM public.files WHERE id = $1', [r.id]);
    }
    res.json({ removidos: rows.length });
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

app.post('/api/settings/:key', requireAdmin, async (req, res) => {
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
    await ensureProfilesAssignedModules();
    const { email, password } = req.body || {};
    const { rows } = await pool.query('SELECT * FROM public.profiles WHERE email = $1 LIMIT 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (user.is_active === false) return res.status(403).json({ error: 'Usuário inativo' });
    // Se o usuário não possui senha definida ainda, definir agora (primeiro acesso)
    if (!user.password_hash && password) {
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE public.profiles SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, user.id]);
      user.password_hash = newHash;
    }
    if (!user.password_hash) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    await registrarAcesso(req, user.id);
    return res.json({
      token: signToken(user),
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedCategories: user.assigned_categories || [],
      assignedModules: user.assigned_modules || [],
      isActive: user.is_active,
      userGroup: user.user_group || null,
      createdAt: user.created_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      // Mesma regra das pastas: o colaborador não precisa receber a lista de
      // setores dos outros só para o navegador escondê-la depois.
      await ensureUserContentAccess();
      const { rows } = await pool.query(
        `SELECT c.* FROM public.categories c
          WHERE c.id = ANY($1::uuid[])
            AND (c.release_at IS NULL OR c.release_at <= now())
            AND (COALESCE(array_length(c.target_groups,1),0) = 0 OR $3::text = ANY(c.target_groups))
            AND NOT EXISTS (
              SELECT 1 FROM public.user_content_access a
               WHERE a.user_id = $2 AND a.scope_type = 'category' AND a.scope_id = c.id
                 AND a.release_at IS NOT NULL AND a.release_at > now())
          ORDER BY c.name`,
        [req.user.assigned_categories || [], req.user.id, req.user.user_group || ''],
      );
      return res.json(rows);
    }
    const { rows } = await pool.query('SELECT * FROM public.categories ORDER BY name');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    await ensureContentEnhancementColumns();
    const { name, description, thumbnail, release_at, target_groups } = req.body || {};
    const { rows } = await pool.query(
      'INSERT INTO public.categories (name, description, thumbnail, release_at, target_groups) VALUES ($1,$2,$3,$4,$5::text[]) RETURNING *',
      [name, description, thumbnail, release_at || null, Array.isArray(target_groups) ? target_groups : []]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    await ensureContentEnhancementColumns();
    const { id } = req.params;
    const fields = ['name','description','thumbnail','release_at','target_groups'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        // text[] precisa de cast explícito; sem ele o Postgres não infere o tipo.
        updates.push(f === 'target_groups' ? `"${f}" = $${idx++}::text[]` : `"${f}" = $${idx++}`);
        values.push(f === 'target_groups' ? (Array.isArray(req.body[f]) ? req.body[f] : []) : req.body[f]);
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

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.categories WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Modules (hierárquico: category_id, parent_id)
// Pastas visíveis a um não-admin, pelas mesmas regras dos vídeos. Antes a
// listagem devolvia todos os módulos e cabia ao navegador esconder os alheios:
// era assim que um colaborador do almoxarifado enxergava as ~45 subpastas do
// setorial. Os ancestrais de uma pasta concedida entram na resposta mesmo sem
// serem concedidos, senão a trilha até ela ficaria quebrada.
const MODULOS_VISIVEIS_SQL = `
  WITH RECURSIVE cadeia AS (
    SELECT id, parent_id, category_id, release_at, target_groups, id AS raiz_de
      FROM public.modules
    UNION ALL
    SELECT m.id, m.parent_id, m.category_id, m.release_at, m.target_groups, c.raiz_de
      FROM public.modules m
      JOIN cadeia c ON c.parent_id = m.id
  ),
  agendamento_usuario AS (
    SELECT scope_type, scope_id
      FROM public.user_content_access
     WHERE user_id = $3 AND release_at IS NOT NULL AND release_at > now()
  ),
  situacao AS (
    SELECT ch.raiz_de AS module_id,
           bool_and(ch.release_at IS NULL OR ch.release_at <= now()) AS liberado,
           bool_or(ch.id = ANY($2::uuid[]))                          AS concedido,
           bool_or(COALESCE(array_length(ch.target_groups,1),0) > 0
                   AND NOT ($4::text = ANY(ch.target_groups)))        AS fora_do_grupo,
           bool_or(a.scope_id IS NOT NULL)                            AS agendado
      FROM cadeia ch
      LEFT JOIN agendamento_usuario a
        ON a.scope_type = 'module' AND a.scope_id = ch.id
     GROUP BY ch.raiz_de
  )
  SELECT m.* FROM public.modules m
   JOIN situacao s ON s.module_id = m.id
   JOIN public.categories c ON c.id = m.category_id
   WHERE c.id = ANY($1::uuid[])
     AND (c.release_at IS NULL OR c.release_at <= now())
     AND (COALESCE(array_length(c.target_groups,1),0) = 0 OR $4::text = ANY(c.target_groups))
     AND NOT EXISTS (SELECT 1 FROM agendamento_usuario a
                      WHERE a.scope_type = 'category' AND a.scope_id = c.id)
     AND s.liberado AND NOT s.fora_do_grupo AND NOT s.agendado
     AND (
       NOT EXISTS (SELECT 1 FROM public.modules m2
                    WHERE m2.category_id = m.category_id AND m2.id = ANY($2::uuid[]))
       OR s.concedido
       OR EXISTS (SELECT 1 FROM cadeia ch
                   WHERE ch.id = m.id AND ch.raiz_de = ANY($2::uuid[]))
     )
     AND ($5::uuid[] IS NULL OR m.category_id = ANY($5::uuid[]))
   ORDER BY m."order", m.title`;

app.get('/api/modules', async (req, res) => {
  try {
    await ensureModulesSchema();
    // categoryIds (lista) evita o N+1 de uma chamada por categoria.
    const { categoryId, categoryIds } = req.query;
    const lista = categoryIds
      ? String(categoryIds).split(',').map((s) => s.trim()).filter(Boolean)
      : (categoryId ? [String(categoryId)] : []);

    if (req.user.role !== 'admin') {
      await ensureUserContentAccess();
      const { rows } = await pool.query(MODULOS_VISIVEIS_SQL, [
        req.user.assigned_categories || [],
        req.user.assigned_modules || [],
        req.user.id,
        req.user.user_group || '',
        lista.length > 0 ? lista : null,
      ]);
      return res.json(rows);
    }

    const params = [];
    let sql = 'SELECT * FROM public.modules';
    if (lista.length > 0) {
      sql += ' WHERE category_id = ANY($1::uuid[])';
      params.push(lista);
    }
    sql += ' ORDER BY "order", title';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/modules', requireAdmin, async (req, res) => {
  try {
    await ensureModulesSchema();
    const { category_id, parent_id, title, description, order, release_at, evaluation_url } = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO public.modules (category_id, parent_id, title, description, "order", release_at, evaluation_url, target_groups)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::text[])
       RETURNING *`,
      [category_id, parent_id || null, title, description || null, Number.isFinite(order) ? order : 0, release_at || null, evaluation_url || null, Array.isArray(req.body?.target_groups) ? req.body.target_groups : []]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/modules/:id', requireAdmin, async (req, res) => {
  try {
    await ensureModulesSchema();
    const { id } = req.params;
    const fields = ['category_id','parent_id','title','description','order','release_at','evaluation_url','target_groups'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(f === 'target_groups' ? `"${f}" = $${idx++}::text[]` : `"${f}" = $${idx++}`);
        values.push(f === 'target_groups' ? (Array.isArray(req.body[f]) ? req.body[f] : []) : req.body[f]);
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

app.delete('/api/modules/:id', requireAdmin, async (req, res) => {
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

/**
 * Com "Este conteúdo possui formulário? Sim", exigir link ou arquivo. Sem isso
 * o aluno veria a chamada para a atividade sem ter para onde ir.
 */
function validarFormulario(body) {
  if (!body?.has_form) return null;
  const temLink = typeof body.form_url === 'string' && body.form_url.trim().length > 0;
  const temArquivo = !!(body.form_file && body.form_file.url);
  if (!temLink && !temArquivo) {
    return 'Conteúdo marcado com formulário precisa de um link ou de um arquivo anexado';
  }
  return null;
}

// Videos
// Não-admin recebe apenas o que pode ver: a regra deixa de depender do
// navegador. Categoria, módulo (e ancestrais) e o próprio vídeo precisam
// estar liberados; havendo módulos atribuídos na categoria, só eles valem.
const VIDEOS_VISIVEIS_SQL = `
  WITH RECURSIVE cadeia AS (
    SELECT id, parent_id, category_id, release_at, id AS raiz_de
      FROM public.modules
    UNION ALL
    SELECT m.id, m.parent_id, m.category_id, m.release_at, c.raiz_de
      FROM public.modules m
      JOIN cadeia c ON c.parent_id = m.id
  ),
  modulo_liberado AS (
    SELECT raiz_de AS module_id,
           bool_and(release_at IS NULL OR release_at <= now()) AS liberado,
           bool_or(id = ANY($2::uuid[]))                       AS concedido
      FROM cadeia
     GROUP BY raiz_de
  ),
  -- Liberação programada individual: adia o acesso deste usuário a uma
  -- categoria ou módulo que ele já tem concedido.
  agendamento_usuario AS (
    SELECT scope_type, scope_id, release_at
      FROM public.user_content_access
     WHERE user_id = $3 AND release_at IS NOT NULL AND release_at > now()
  )
  SELECT v.* FROM public.videos v
   WHERE (v.release_at IS NULL OR v.release_at <= now())
     AND EXISTS (
       SELECT 1 FROM public.categories c
        WHERE c.id = ANY(COALESCE(v.category_ids, ARRAY[v.category_id]))
          AND c.id = ANY($1::uuid[])
          AND (c.release_at IS NULL OR c.release_at <= now())
          -- Categoria sem grupo definido vale para todos; com grupos, só para eles.
          AND (COALESCE(array_length(c.target_groups,1),0) = 0
               OR $4::text = ANY(c.target_groups))
          AND NOT EXISTS (SELECT 1 FROM agendamento_usuario a
                           WHERE a.scope_type = 'category' AND a.scope_id = c.id)
          AND (
            NOT EXISTS (SELECT 1 FROM public.modules m
                         WHERE m.category_id = c.id AND m.id = ANY($2::uuid[]))
            OR COALESCE((SELECT ml.concedido FROM modulo_liberado ml
                          WHERE ml.module_id = v.module_id), false)
          )
     )
     AND COALESCE((SELECT ml.liberado FROM modulo_liberado ml
                    WHERE ml.module_id = v.module_id), true)
     -- Nenhum módulo da cadeia pode estar agendado para este usuário.
     AND NOT EXISTS (
       SELECT 1 FROM cadeia ch
        JOIN agendamento_usuario a
          ON a.scope_type = 'module' AND a.scope_id = ch.id
       WHERE ch.raiz_de = v.module_id
     )
     -- Nem restrito a um grupo do qual este usuário não faz parte.
     AND NOT EXISTS (
       SELECT 1 FROM cadeia ch
        JOIN public.modules m3 ON m3.id = ch.id
       WHERE ch.raiz_de = v.module_id
         AND COALESCE(array_length(m3.target_groups,1),0) > 0
         AND NOT ($4::text = ANY(m3.target_groups))
     )
   ORDER BY COALESCE(v."order", 0) ASC, v.uploaded_at ASC`;

app.get('/api/videos', async (req, res) => {
  try {
    const pag = paginacao(req);
    if (req.user.role === 'admin') {
      const busca = String(req.query.search || '').trim();
      const params = [];
      let where = '';
      if (busca) { params.push(`%${busca}%`); where = `WHERE title ILIKE $${params.length}`; }
      let total = 0;
      if (pag) {
        const { rows: c } = await pool.query(`SELECT count(*)::int AS n FROM public.videos ${where}`, params);
        total = c[0]?.n || 0;
      }
      const limites = pag ? ` LIMIT ${pag.limit} OFFSET ${pag.offset}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM public.videos ${where} ORDER BY COALESCE("order", 0) ASC, uploaded_at ASC${limites}`, params);
      return responder(res, rows, pag, total);
    }
    await ensureUserContentAccess();
    const { rows } = await pool.query(VIDEOS_VISIVEIS_SQL, [
      req.user.assigned_categories || [],
      req.user.assigned_modules || [],
      req.user.id,
      req.user.user_group || '',
    ]);
    return res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/videos', requireAdmin, async (req, res) => {
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
      release_at,
      support_files,
      content_type,
      has_form,
      form_url,
      form_file,
    } = req.body || {};

    const erroFormulario = validarFormulario(req.body);
    if (erroFormulario) return res.status(400).json({ error: erroFormulario });

    // ensure optional array column exists
    try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_ids uuid[]'); } catch {}
    await ensureContentEnhancementColumns();

    const order = req.body.order !== undefined ? req.body.order : null;
    const { rows } = await pool.query(
      `INSERT INTO public.videos (title, description, video_url, thumbnail, category_id, module_id, duration, uploaded_by, uploaded_at, vimeo_id, vimeo_embed_url, "order", release_at, support_files, content_type, has_form, form_url, form_file)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now(), $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17::jsonb)
       RETURNING *`,
      [title, description, video_url, thumbnail, category_id, module_id || null, duration || 0, uploaded_by || 'admin', vimeo_id, vimeo_embed_url, order, release_at || null, JSON.stringify(Array.isArray(support_files) ? support_files : []), content_type || 'video', !!has_form, has_form ? (form_url || null) : null, has_form && form_file ? JSON.stringify(form_file) : null]
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

app.put('/api/videos/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // ensure optional array column exists
    try { await pool.query('ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_ids uuid[]'); } catch {}
    await ensureContentEnhancementColumns();

    const fields = ['title','description','video_url','thumbnail','category_id','category_ids','module_id','duration','vimeo_id','vimeo_embed_url','order','release_at','support_files','content_type','has_form','form_url','form_file'];
    if (req.body?.has_form !== undefined) {
      const erro = validarFormulario(req.body);
      if (erro) return res.status(400).json({ error: erro });
      // Desmarcar o formulário limpa link e arquivo, senão sobrariam órfãos
      // que voltariam a valer se alguém remarcasse a opção.
      if (!req.body.has_form) {
        req.body.form_url = null;
        req.body.form_file = null;
      }
    }
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'category_ids') {
          updates.push(`"${f}" = $${idx++}::uuid[]`);
          values.push(req.body[f]);
        } else if (f === 'support_files') {
          updates.push(`"${f}" = $${idx++}::jsonb`);
          values.push(JSON.stringify(Array.isArray(req.body[f]) ? req.body[f] : []));
        } else if (f === 'form_file') {
          updates.push(`"${f}" = $${idx++}::jsonb`);
          values.push(req.body[f] ? JSON.stringify(req.body[f]) : null);
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

app.delete('/api/videos/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.videos WHERE id = $1', [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint para corrigir sincronização de module_id e category_id
app.post('/api/videos/fix-module-category-sync', requireAdmin, async (req, res) => {
  try {
    await ensureModulesSchema();
    
    // Atualizar category_id para corresponder à categoria do módulo
    const updateCategoryId = await pool.query(`
      UPDATE public.videos v
      SET 
        category_id = m.category_id,
        updated_at = now()
      FROM public.modules m
      WHERE v.module_id = m.id 
        AND v.category_id IS DISTINCT FROM m.category_id
      RETURNING v.id
    `);
    
    // Atualizar category_ids para incluir a nova categoria principal
    const updateCategoryIds = await pool.query(`
      UPDATE public.videos v
      SET 
        category_ids = CASE 
          WHEN v.category_ids IS NULL OR array_length(v.category_ids, 1) IS NULL THEN
            ARRAY[m.category_id]
          WHEN NOT (m.category_id = ANY(v.category_ids)) THEN
            ARRAY[m.category_id] || v.category_ids
          ELSE
            v.category_ids
        END,
        updated_at = now()
      FROM public.modules m
      WHERE v.module_id = m.id 
        AND v.module_id IS NOT NULL
      RETURNING v.id
    `);
    
    const totalFixed = updateCategoryId.rowCount || 0;
    
    res.json({
      success: true,
      videosFixed: totalFixed,
      message: `${totalFixed} vídeo(s) corrigido(s) com sucesso.`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Profiles (Users)
// Colunas explícitas: o SELECT * anterior devolvia password_hash de todo mundo.
const PROFILE_COLUMNS = 'id, email, name, role, assigned_categories, assigned_modules, is_active, user_group, created_at, updated_at';

/**
 * Paginação opcional e retrocompatível: sem page/limit a resposta continua
 * sendo o array puro que as telas já consomem; com eles vem
 * { items, total, page, limit, pages }.
 */
const paginacao = (req) => {
  const pediu = req.query.page !== undefined || req.query.limit !== undefined;
  if (!pediu) return null;
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
  const page = Math.max(1, Number(req.query.page) || 1);
  return { limit, page, offset: (page - 1) * limit };
};

const responder = (res, rows, pag, total) =>
  pag
    ? res.json({ items: rows, total, page: pag.page, limit: pag.limit,
                 pages: Math.max(1, Math.ceil(total / pag.limit)) })
    : res.json(rows);

app.get('/api/profiles', requireAdmin, async (req, res) => {
  try {
    await ensureProfilesAssignedModules();
    const busca = String(req.query.search || '').trim();
    const filtros = [];
    const params = [];
    if (busca) {
      params.push(`%${busca}%`);
      filtros.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (req.query.role) {
      params.push(String(req.query.role));
      filtros.push(`role = $${params.length}`);
    }
    if (req.query.active === 'true' || req.query.active === 'false') {
      filtros.push(req.query.active === 'true' ? 'is_active IS NOT false' : 'is_active IS false');
    }
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    const pag = paginacao(req);
    let total = 0;
    if (pag) {
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM public.profiles ${where}`, params);
      total = rows[0]?.n || 0;
    }
    const limites = pag ? ` LIMIT ${pag.limit} OFFSET ${pag.offset}` : '';
    const { rows } = await pool.query(
      `SELECT ${PROFILE_COLUMNS} FROM public.profiles ${where} ORDER BY name${limites}`, params);
    responder(res, rows, pag, total);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (movido para o final do arquivo após todas as rotas /api)

app.post('/api/profiles', requireAdmin, async (req, res) => {
  try {
    await ensureProfilesAssignedModules();
    const { email, name, role = 'user', assigned_categories = [], assigned_modules = [], is_active = true, password, user_group = null } = req.body || {};
    if (grupoInvalido(user_group)) {
      return res.status(400).json({ error: `Grupo inválido: ${user_group}. Use em_treinamento ou efetivo.` });
    }
    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }
    const { rows } = await pool.query(
      'INSERT INTO public.profiles (email, name, role, assigned_categories, assigned_modules, is_active, password_hash, user_group) VALUES ($1,$2,$3,$4::uuid[],$5::uuid[],$6,$7,$8) RETURNING ' + PROFILE_COLUMNS,
      [email, name, role, assigned_categories, assigned_modules, is_active, password_hash, user_group || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/profiles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureProfilesAssignedModules();
    if (grupoInvalido(req.body?.user_group)) {
      return res.status(400).json({ error: `Grupo inválido: ${req.body.user_group}. Use em_treinamento ou efetivo.` });
    }
    const fields = ['email','name','role','assigned_categories','assigned_modules','is_active','user_group'];
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
    const sql = `UPDATE public.profiles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING ${PROFILE_COLUMNS}`;
    const { rows } = await pool.query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/profiles/:id', requireAdmin, async (req, res) => {
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
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Você só pode alterar a própria senha' });
    }
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
app.post('/api/vimeo-auth', requireAdmin, async (req, res) => {
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

app.post('/api/vimeo-upload', requireAdmin, async (req, res) => {
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
    // Usuário comum só lê o próprio histórico, ignorando o userId recebido.
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.id;
    const params = [];
    let sql = 'SELECT * FROM public.view_history';
    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }
    sql += ' ORDER BY last_watched_at DESC';
    const pag = paginacao(req);
    let total = 0;
    if (pag) {
      const contagem = sql.replace(/^SELECT \*/, 'SELECT count(*)::int AS n').replace(/ ORDER BY .*$/, '');
      const { rows: c } = await pool.query(contagem, params);
      total = c[0]?.n || 0;
      sql += ` LIMIT ${pag.limit} OFFSET ${pag.offset}`;
    }
    const { rows } = await pool.query(sql, params);
    responder(res, rows, pag, total);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// View History - recent with joins
app.get('/api/view-history/recent', requireAdmin, async (req, res) => {
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
    const user_id = req.user.id;
    const { user_id: _ignorado, video_id, watched_duration, completed } = req.body || {};
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

// --- Relatórios gerenciais (itens 1 e 5 do documento) ---
// Agregação em SQL. Antes o painel baixava o histórico inteiro e somava no
// navegador, o que piorava a cada novo registro de visualização.
// Uma data ilegível não pode ser ignorada em silêncio: o relatório mostraria
// o período inteiro como se fosse o intervalo pedido.
class PeriodoInvalido extends Error {}

const parseData = (valor, campo) => {
  if (valor === undefined || valor === null || valor === '') return null;
  // "+" vira espaço quando a query string não é codificada; recuperamos o fuso.
  const bruto = String(valor).replace(/ (\d{2}:\d{2})$/, '+$1');
  const d = new Date(bruto);
  if (Number.isNaN(d.getTime())) throw new PeriodoInvalido(`Parâmetro "${campo}" não é uma data válida`);
  return d.toISOString();
};

const periodo = (req) => [parseData(req.query.from, 'from'), parseData(req.query.to, 'to')];

const comPeriodo = (handler) => async (req, res) => {
  try {
    return await handler(req, res, periodo(req));
  } catch (e) {
    if (e instanceof PeriodoInvalido) return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: e.message });
  }
};
const FILTRO_PERIODO = `($1::timestamptz IS NULL OR vh.last_watched_at >= $1)
                    AND ($2::timestamptz IS NULL OR vh.last_watched_at <= $2)`;

app.get('/api/reports/summary', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM public.profiles WHERE role <> 'admin')            AS total_usuarios,
        (SELECT count(*) FROM public.profiles WHERE role <> 'admin'
                                                AND is_active IS NOT false)     AS usuarios_ativos,
        (SELECT count(*) FROM public.videos)                                    AS total_videos,
        (SELECT COALESCE(sum(duration), 0) FROM public.videos)                  AS acervo_segundos,
        count(*)                                                                AS visualizacoes,
        count(DISTINCT vh.user_id)                                              AS usuarios_no_periodo,
        COALESCE(sum(vh.watched_duration), 0)                                   AS segundos_assistidos,
        count(*) FILTER (WHERE vh.completed)                                    AS conclusoes
      FROM public.view_history vh WHERE ${FILTRO_PERIODO}`, p);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get('/api/reports/users', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    await ensureAccessLog();
    const { rows } = await pool.query(`
      SELECT pr.id, pr.name, pr.email, pr.role, pr.is_active,
             count(vh.*)                                   AS visualizacoes,
             count(vh.*) FILTER (WHERE vh.completed)       AS conclusoes,
             COALESCE(sum(vh.watched_duration), 0)         AS segundos_assistidos,
             max(vh.last_watched_at)                       AS ultimo_conteudo,
             (SELECT max(al.occurred_at) FROM public.access_log al
               WHERE al.user_id = pr.id
                 AND ($1::timestamptz IS NULL OR al.occurred_at >= $1)
                 AND ($2::timestamptz IS NULL OR al.occurred_at <= $2)) AS ultimo_login
        FROM public.profiles pr
        LEFT JOIN public.view_history vh
               ON vh.user_id = pr.id AND ${FILTRO_PERIODO}
       WHERE pr.role <> 'admin'
       GROUP BY pr.id, pr.name, pr.email, pr.role, pr.is_active
       ORDER BY segundos_assistidos DESC, visualizacoes DESC`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get('/api/reports/content', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.id, v.title, v.duration, v.content_type,
             c.name                                        AS categoria,
             m.title                                       AS modulo,
             count(vh.*)                                   AS visualizacoes,
             count(DISTINCT vh.user_id)                    AS espectadores,
             count(vh.*) FILTER (WHERE vh.completed)       AS conclusoes,
             COALESCE(sum(vh.watched_duration), 0)         AS segundos_assistidos
        FROM public.videos v
        LEFT JOIN public.categories c ON c.id = v.category_id
        LEFT JOIN public.modules m    ON m.id = v.module_id
        LEFT JOIN public.view_history vh
               ON vh.video_id = v.id AND ${FILTRO_PERIODO}
       GROUP BY v.id, v.title, v.duration, v.content_type, c.name, m.title
       ORDER BY visualizacoes DESC, segundos_assistidos DESC`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get('/api/reports/categories', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.name,
             count(DISTINCT v.id)                          AS videos,
             count(vh.*)                                   AS visualizacoes,
             count(DISTINCT vh.user_id)                    AS espectadores,
             COALESCE(sum(vh.watched_duration), 0)         AS segundos_assistidos
        FROM public.categories c
        LEFT JOIN public.videos v ON v.category_id = c.id
        LEFT JOIN public.view_history vh
               ON vh.video_id = v.id AND ${FILTRO_PERIODO}
       GROUP BY c.id, c.name
       ORDER BY visualizacoes DESC, c.name`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get('/api/reports/access', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    await ensureAccessLog();
    const { rows } = await pool.query(`
      SELECT pr.id, pr.name, pr.email, pr.role, pr.is_active,
             count(al.*)                                   AS acessos,
             max(al.occurred_at)                           AS ultimo_acesso,
             min(al.occurred_at)                           AS primeiro_acesso,
             count(DISTINCT date_trunc('day', al.occurred_at)) AS dias_distintos
        FROM public.profiles pr
        LEFT JOIN public.access_log al
               ON al.user_id = pr.id
              AND ($1::timestamptz IS NULL OR al.occurred_at >= $1)
              AND ($2::timestamptz IS NULL OR al.occurred_at <= $2)
       WHERE pr.role <> 'admin'
       GROUP BY pr.id, pr.name, pr.email, pr.role, pr.is_active
       ORDER BY ultimo_acesso DESC NULLS LAST, pr.name`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// Cada entrada no portal, para auditoria — quem entrou e quando.
app.get('/api/reports/access-log', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    await ensureAccessLog();
    const { rows } = await pool.query(`
      SELECT al.occurred_at, al.ip, al.user_agent, pr.name, pr.email
        FROM public.access_log al
        JOIN public.profiles pr ON pr.id = al.user_id
       WHERE ($1::timestamptz IS NULL OR al.occurred_at >= $1)
         AND ($2::timestamptz IS NULL OR al.occurred_at <= $2)
       ORDER BY al.occurred_at DESC
       LIMIT 500`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get('/api/reports/timeline', requireAdmin, comPeriodo(async (req, res, p) => {
  try {
    const { rows } = await pool.query(`
      SELECT to_char(date_trunc('day', vh.last_watched_at), 'YYYY-MM-DD') AS dia,
             count(*)                                      AS visualizacoes,
             count(DISTINCT vh.user_id)                    AS usuarios,
             COALESCE(sum(vh.watched_duration), 0)         AS segundos_assistidos
        FROM public.view_history vh
       WHERE ${FILTRO_PERIODO}
       GROUP BY 1 ORDER BY 1`, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

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
    const { videoId } = req.query;
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.id;
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
app.delete('/api/vimeo/:videoId', requireAdmin, async (req, res) => {
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
    const user_id = req.user.id;
    const { user_id: _ignorado, video_id } = req.body || {};
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
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
// 404 JSON para rotas /api desconhecidas
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// Qualquer outra rota serve o index.html (SPA)
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
