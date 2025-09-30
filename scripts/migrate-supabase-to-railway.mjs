import pkg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pkg;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exnfttsyfhtkgpuewgnk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmZ0dHN5Zmh0a2dwdWV3Z25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzQzMDcsImV4cCI6MjA3NDIxMDMwN30.tbpYSRYZwrTH0YvTHYFXl0Vd0CCIaul_RQ2b9WHKj68';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAll(table, select = '*', pageSize = 1000) {
  let from = 0;
  let to = pageSize - 1;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    to += pageSize;
  }
  return rows;
}

function buildUpsertQuery(table, sampleRow) {
  const columns = Object.keys(sampleRow);
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const values = columns.map((_, i) => `$${i + 1}`).join(', ');
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');
  const text = `INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
  return { text, columns };
}

async function upsertRows(client, table, rows) {
  if (!rows || rows.length === 0) return { inserted: 0 };
  const { text, columns } = buildUpsertQuery(table, rows[0]);
  let count = 0;
  for (const row of rows) {
    const values = columns.map((c) => row[c] ?? null);
    await client.query(text, values);
    count += 1;
  }
  return { inserted: count };
}

async function upsertProfilesByEmail(client, rows) {
  if (!rows || rows.length === 0) return { upserted: 0 };
  let count = 0;
  for (const p of rows) {
    // Ensure array type
    const assigned = Array.isArray(p.assigned_categories) ? p.assigned_categories : [];

    const { rows: existing } = await client.query(
      'SELECT id FROM public."profiles" WHERE email = $1',
      [p.email]
    );

    if (existing && existing.length > 0) {
      // Update existing by email, preserve id
      await client.query(
        'UPDATE public."profiles" SET name = $2, role = $3, assigned_categories = $4::uuid[], is_active = $5, updated_at = COALESCE($6, now()) WHERE email = $1',
        [
          p.email,
          p.name ?? null,
          p.role ?? 'user',
          assigned,
          p.is_active ?? true,
          p.updated_at ?? null,
        ]
      );
    } else {
      // Insert new
      await client.query(
        'INSERT INTO public."profiles" (id, email, name, role, assigned_categories, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5::uuid[], $6, COALESCE($7, now()), COALESCE($8, now())) ON CONFLICT (email) DO NOTHING',
        [
          p.id ?? null,
          p.email,
          p.name ?? null,
          p.role ?? 'user',
          assigned,
          p.is_active ?? true,
          p.created_at ?? null,
          p.updated_at ?? null,
        ]
      );
    }
    count += 1;
  }
  return { upserted: count };
}

async function main() {
  const [railwayConnectionString] = process.argv.slice(2);
  if (!railwayConnectionString) {
    console.error('Usage: node scripts/migrate-supabase-to-railway.mjs <railway_connection_string>');
    process.exit(1);
  }

  const client = new Client({ connectionString: railwayConnectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Fetching data from Supabase...');
    const [categories, profiles, videos, comments, viewHistory, videoProgress] = await Promise.all([
      fetchAll('categories'),
      fetchAll('profiles'),
      fetchAll('videos'),
      fetchAll('comments'),
      fetchAll('view_history'),
      fetchAll('video_progress'),
    ]);

    console.log(`Fetched: categories=${categories.length}, profiles=${profiles.length}, videos=${videos.length}, comments=${comments.length}, view_history=${viewHistory.length}, video_progress=${videoProgress.length}`);

    // Ensure arrays are correct types
    for (const p of profiles) {
      if (p.assigned_categories && !Array.isArray(p.assigned_categories)) {
        try { p.assigned_categories = JSON.parse(p.assigned_categories); } catch {}
      }
    }

    console.log('Upserting into Railway (ordered for FKs)...');
    if (categories.length) await upsertRows(client, 'categories', categories);
    if (profiles.length) await upsertProfilesByEmail(client, profiles);
    if (videos.length) await upsertRows(client, 'videos', videos);
    if (comments.length) await upsertRows(client, 'comments', comments);
    if (viewHistory.length) await upsertRows(client, 'view_history', viewHistory);
    if (videoProgress.length) await upsertRows(client, 'video_progress', videoProgress);

    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();


