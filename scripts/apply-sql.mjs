import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from 'pg';

const { Client } = pkg;

async function applySql(client, filePath) {
  const absolutePath = path.resolve(filePath);
  const sql = await fs.readFile(absolutePath, 'utf8');

  console.log(`\n--- Applying: ${absolutePath} ---`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ Applied: ${absolutePath}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed: ${absolutePath}`);
    throw error;
  }
}

async function main() {
  const [connectionString, ...files] = process.argv.slice(2);
  if (!connectionString || files.length === 0) {
    console.error('Usage: node scripts/apply-sql.mjs <connectionString> <file1.sql> [file2.sql ...]');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    for (const file of files) {
      await applySql(client, file);
    }
    console.log('\nAll migrations applied successfully.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();


