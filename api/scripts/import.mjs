/**
 * Aplica schema.sql e importa só os dados do app a partir do dump do Supabase.
 * Não imprime e-mails nem hashes. Senhas antigas viram 'pending' (cadastro de novo).
 *
 * DATABASE_URL=postgresql://... node scripts/import.mjs
 */
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dumpPath = path.join(root, 'db_cluster-01-09-2026@18-12-16.backup.gz');
const schemaPath = path.join(root, 'api', 'schema.sql');

const WANTED = new Set([
  'auth.users',
  'public.profiles',
  'public.cellars',
  'public.wines_cache',
  'public.cellar_wines',
]);

function unescapeField(field) {
  if (field === '\\N') return null;
  let out = '';
  for (let i = 0; i < field.length; i += 1) {
    if (field[i] !== '\\') {
      out += field[i];
      continue;
    }
    const next = field[i + 1];
    if (next === undefined) break;
    const map = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\' };
    if (map[next] !== undefined) {
      out += map[next];
      i += 1;
      continue;
    }
    if (/[0-7]/.test(next)) {
      const octal = field.slice(i + 1, i + 4);
      if (/^[0-7]{1,3}$/.test(octal)) {
        out += String.fromCharCode(parseInt(octal, 8));
        i += octal.length;
        continue;
      }
    }
    out += next;
    i += 1;
  }
  return out;
}

function splitCopyLine(line) {
  const fields = [];
  let current = '';
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '\\') {
      current += line[i];
      if (i + 1 < line.length) {
        current += line[i + 1];
        i += 1;
      }
      continue;
    }
    if (line[i] === '\t') {
      fields.push(unescapeField(current));
      current = '';
      continue;
    }
    current += line[i];
  }
  fields.push(unescapeField(current));
  return fields;
}

function parseHeader(line) {
  const match = line.match(/^COPY ([^\s]+) \((.+)\) FROM stdin;$/);
  if (!match) return null;
  return {
    table: match[1],
    columns: match[2].split(',').map((col) => col.trim()),
  };
}

async function readDump() {
  const tables = new Map();
  const input = createReadStream(dumpPath).pipe(createGunzip());
  const rl = createInterface({ input, crlfDelay: Infinity });
  let current = null;
  for await (const line of rl) {
    if (!current) {
      const header = parseHeader(line);
      if (header && WANTED.has(header.table)) current = { ...header, rows: [] };
      continue;
    }
    if (line === '\\.') {
      tables.set(current.table, current);
      current = null;
      continue;
    }
    const values = splitCopyLine(line);
    const row = {};
    current.columns.forEach((column, index) => {
      row[column] = values[index] ?? null;
    });
    current.rows.push(row);
  }
  return tables;
}

function asJson(value) {
  if (value == null || value === '') return '{}';
  return value;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL ausente. Pegue a connection string no Neon e rode de novo.');
    process.exit(1);
  }

  const tables = await readDump();
  const users = tables.get('auth.users')?.rows ?? [];
  const profiles = tables.get('public.profiles')?.rows ?? [];
  const cellars = tables.get('public.cellars')?.rows ?? [];
  const wines = tables.get('public.wines_cache')?.rows ?? [];
  const bottles = tables.get('public.cellar_wines')?.rows ?? [];

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });
  await client.connect();
  try {
    const schema = await readFile(schemaPath, 'utf8');
    await client.query(schema);
    await client.query('BEGIN');
    await client.query('DELETE FROM public.users');
    await client.query('TRUNCATE public.wines_cache RESTART IDENTITY CASCADE');

    for (const user of users) {
      if (!user.id || !user.email) continue;
      await client.query(
        `INSERT INTO public.users (id, email, password_hash, created_at)
         VALUES ($1, $2, 'pending', COALESCE($3::timestamptz, now()))
         ON CONFLICT (id) DO NOTHING`,
        [user.id, String(user.email).toLowerCase(), user.created_at],
      );
    }

    for (const profile of profiles) {
      await client.query(
        `INSERT INTO public.profiles (id, display_name, locale, is_admin, created_at, updated_at)
         VALUES ($1, $2, COALESCE($3, 'pt-BR'), COALESCE($4::boolean, false),
                 COALESCE($5::timestamptz, now()), COALESCE($6::timestamptz, now()))
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           is_admin = EXCLUDED.is_admin`,
        [
          profile.id,
          profile.display_name,
          profile.locale,
          profile.is_admin,
          profile.created_at,
          profile.updated_at,
        ],
      );
    }

    for (const wine of wines) {
      await client.query(
        `INSERT INTO public.wines_cache (
           id, normalized_name, name, producer, vintage, region, country, grape_variety,
           wine_type, tasting_notes, pairing_notes, alcohol_pct, serving_temp_c,
           metadata, source, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,
           COALESCE($16::timestamptz, now()), COALESCE($17::timestamptz, now())
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          wine.id,
          wine.normalized_name,
          wine.name,
          wine.producer,
          wine.vintage,
          wine.region,
          wine.country,
          wine.grape_variety,
          wine.wine_type,
          wine.tasting_notes,
          wine.pairing_notes,
          wine.alcohol_pct,
          wine.serving_temp_c,
          asJson(wine.metadata),
          wine.source || 'gemini',
          wine.created_at,
          wine.updated_at,
        ],
      );
    }

    for (const cellar of cellars) {
      await client.query(
        `INSERT INTO public.cellars (id, user_id, name, type, capacity, created_at, updated_at)
         VALUES ($1,$2,$3,$4::public.cellar_type,COALESCE($5::int, 50),
                 COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))
         ON CONFLICT (id) DO NOTHING`,
        [
          cellar.id,
          cellar.user_id,
          cellar.name,
          cellar.type,
          cellar.capacity,
          cellar.created_at,
          cellar.updated_at,
        ],
      );
    }

    for (const bottle of bottles) {
      await client.query(
        `INSERT INTO public.cellar_wines (
           id, cellar_id, wine_cache_id, quantity, notes, purchased_at, created_at, updated_at
         ) VALUES (
           $1,$2,$3,COALESCE($4::int, 1),$5,$6::date,
           COALESCE($7::timestamptz, now()), COALESCE($8::timestamptz, now())
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          bottle.id,
          bottle.cellar_id,
          bottle.wine_cache_id,
          bottle.quantity,
          bottle.notes,
          bottle.purchased_at,
          bottle.created_at,
          bottle.updated_at,
        ],
      );
    }

    await client.query('COMMIT');
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM public.users) AS users,
        (SELECT count(*) FROM public.profiles) AS profiles,
        (SELECT count(*) FROM public.cellars) AS cellars,
        (SELECT count(*) FROM public.cellar_wines) AS bottles,
        (SELECT count(*) FROM public.wines_cache) AS wines
    `);
    console.log('Importação concluída:', counts.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Falha na importação:', err instanceof Error ? err.message : 'erro');
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
