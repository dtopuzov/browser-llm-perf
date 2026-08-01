import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(binary, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(binary)} exited with ${code}`));
    });
  });
}

const binDir = path.join(root, 'node_modules', '.bin');
const vibiumSkill = path.join(root, 'drivers', 'vibium', '.agents', 'skills', 'vibe-check', 'SKILL.md');
const expectedVibiumSkillSha256 = '127ef0f29722873157a62ec3c563963709573780f4a522469e27baf01f98653c';

await run(path.join(binDir, 'playwright'), ['cli', 'install', '--skills=agents'], root);
await run(path.join(binDir, 'playwright'), ['cli', 'install', '--skills=claude'], root);
await run(path.join(binDir, 'craftdriver'), ['init', '--agent', 'all'], root);
await run(path.join(binDir, 'playwright'), ['cli', 'install', '--skills=agents'], path.join(root, 'drivers', 'playwright'));
await run(path.join(binDir, 'playwright'), ['cli', 'install', '--skills=claude'], path.join(root, 'drivers', 'playwright'));
await run(path.join(binDir, 'craftdriver'), ['init', '--agent', 'all'], path.join(root, 'drivers', 'craftdriver'));

// Vibium's official installer is network-based. Keep the reviewed upstream
// skill vendored at a pinned commit and copy that exact file into each agent
// location so `npm run skills:install` remains reproducible and offline.
const vibiumSkillBody = await fs.readFile(vibiumSkill);
const vibiumSkillSha256 = createHash('sha256').update(vibiumSkillBody).digest('hex');
if (vibiumSkillSha256 !== expectedVibiumSkillSha256) {
  throw new Error(`Vendored Vibium skill hash changed: ${vibiumSkillSha256}`);
}
for (const destination of [
  path.join(root, '.agents', 'skills', 'vibe-check', 'SKILL.md'),
  path.join(root, '.claude', 'skills', 'vibe-check', 'SKILL.md'),
  path.join(root, 'drivers', 'vibium', '.claude', 'skills', 'vibe-check', 'SKILL.md'),
]) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(vibiumSkill, destination);
}
