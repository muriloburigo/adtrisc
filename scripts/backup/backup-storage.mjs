// Downloads all files from the Supabase Storage buckets used by ADTRISC
// (avatars, fotos) into a local directory, preserving folder structure.
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
const BUCKETS = ['avatars', 'fotos', 'documentos'];

async function downloadDir(bucket, prefix, localDir) {
  const { data: entries, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);

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
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(path.join(localDir, entry.name), buf);
  }
}

for (const bucket of BUCKETS) {
  console.log(`[storage] backing up bucket "${bucket}"...`);
  await downloadDir(bucket, '', path.join(destDir, bucket));
}
console.log('[storage] done.');
