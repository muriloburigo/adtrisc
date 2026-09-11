// Restores Supabase Storage buckets from a local backup produced by
// backup-storage.mjs. Auto-detects buckets from the folder names directly
// under <backup-dir>/storage/ — each such folder IS a bucket name, and
// every file inside it is uploaded at the exact same relative path it was
// downloaded from (that's the invariant backup-storage.mjs guarantees, so
// restoring is purely mechanical — no manual path mapping needed).
//
// Usage: node --env-file=.env.local scripts/backup/restore-storage.mjs <backup-dir>/storage

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Usage: node restore-storage.mjs <backup-dir>/storage');
  process.exit(1);
}
if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
  console.error(`Not a directory: ${srcDir}`);
  process.exit(1);
}

const EXPECTED_PROJECT_REF = 'gjsbxpdkfmqtfwkdcbxh'; // adtrisc

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
// Restaurar no projeto errado é bem pior que fazer backup do errado — aqui é
// escrita. Só segue se a URL for explicitamente do adtrisc (troque
// EXPECTED_PROJECT_REF no topo se algum dia estiver restaurando um projeto
// novo, ex: recriado do zero após um desastre total).
if (!url.includes(EXPECTED_PROJECT_REF)) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL (${url}) não é do projeto adtrisc (${EXPECTED_PROJECT_REF}). Abortando.`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

const buckets = fs.readdirSync(srcDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

if (buckets.length === 0) {
  console.error(`No bucket folders found under ${srcDir}`);
  process.exit(1);
}

let totalOk = 0;
let totalFail = 0;

for (const bucket of buckets) {
  const bucketDir = path.join(srcDir, bucket);
  const files = listFilesRecursive(bucketDir);
  console.log(`[storage] restoring bucket "${bucket}" (${files.length} files)...`);

  for (const fullPath of files) {
    // Relative path inside the bucket folder IS the object key in that bucket.
    const objectPath = path.relative(bucketDir, fullPath).split(path.sep).join('/');
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, fs.readFileSync(fullPath), { upsert: true });
    if (error) {
      console.error(`  FAILED ${bucket}/${objectPath}: ${error.message}`);
      totalFail++;
    } else {
      totalOk++;
    }
  }
}

console.log(`[storage] done. ${totalOk} uploaded, ${totalFail} failed.`);
if (totalFail > 0) process.exit(1);
