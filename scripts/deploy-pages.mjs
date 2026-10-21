/**
 * Build with GitHub Pages base path and publish the `dist/` folder to `gh-pages`.
 * Usage: npm run deploy:pages
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const env = { ...process.env, VITE_BASE_PATH: '/mystic-ndt/' };

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npm', ['run', 'build']);
writeFileSync(join('dist', '.nojekyll'), '');
run('npx', ['--yes', 'gh-pages@6', '-d', 'dist', '-m', 'Deploy prospect demo to GitHub Pages']);
console.log('Published → https://jah-guide.github.io/mystic-ndt/');
