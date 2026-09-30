// Downloads all files from every Supabase Storage bucket of ADTRISC into a
// local directory, preserving folder structure (one folder per bucket).
// Buckets are listed from the project itself, so a bucket created by a new
// feature (ex.: notas-fiscais) is never silently left out of the backup.
// Exits non-zero if any file fails, so backup.sh can retry instead of
// producing a partial backup.
//
// Usage: node --env-file=.env.local scripts/backup/backup-storage.mjs <dest-dir>

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const destDir = process.argv[2];
if (!destDir) {
  console.error('Usage: node backup-storage.mjs <dest-dir>');
  process.exit(1);
}

const EXPECTED_PROJECT_REF = 'gjsbxpdkfmqtfwkdcbxh'; // adtrisc

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
// Uma env var de outro projeto (ex: exportada globalmente no shell) sobrescreveria
// silenciosamente o .env.local e baixaria o storage do projeto errado. Melhor
// falhar alto aqui do que produzir um backup com dados de outro app.
if (!url.includes(EXPECTED_PROJECT_REF)) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL (${url}) não é do projeto adtrisc (${EXPECTED_PROJECT_REF}). Abortando — confira se não há essa variável exportada globalmente no shell (~/.zshrc etc).`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const PAGE = 1000;
let falhas = 0;

async function listAll(bucket, prefix) {
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

async function downloadDir(bucket, prefix, localDir) {
  const entries = await listAll(bucket, prefix);

  fs.mkdirSync(localDir, { recursive: true });

  for (const entry of entries) {
    const remotePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Supabase Storage returns folders as entries with id === null (no file metadata).
    if (entry.id === null) {
      await downloadDir(bucket, remotePath, path.join(localDir, entry.name));
      continue;
    }
    const { data, error: dlErr } = await supabase.storage.from(bucket).download(remotePath);
    if (dlErr) {
      console.error(`  FAILED ${bucket}/${remotePath}: ${dlErr.message}`);
      falhas++;
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(path.join(localDir, entry.name), buf);
  }
}

const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
if (bucketsErr) throw new Error(`listBuckets: ${bucketsErr.message}`);

for (const { name: bucket } of buckets) {
  console.log(`[storage] backing up bucket "${bucket}"...`);
  await downloadDir(bucket, '', path.join(destDir, bucket));
}
if (falhas > 0) {
  console.error(`[storage] ${falhas} arquivo(s) falharam — backup de storage incompleto.`);
  process.exit(1);
}
console.log(`[storage] done (${buckets.length} buckets).`);
