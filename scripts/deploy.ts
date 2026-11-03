/**
 * Builds the game and force-pushes dist/ to the gh-pages branch, which GitHub Pages serves.
 *
 *   npm run deploy
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const run = (cmd: string, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const read = (cmd: string) => execSync(cmd).toString().trim();

const remote = read('git remote get-url origin');
const name = read('git config user.name');
const email = read('git config user.email');
const commit = read('git rev-parse --short HEAD');

run('npm test');
run('npm run build');

// Serve files as-is (no Jekyll processing).
writeFileSync('dist/.nojekyll', '');

run('git init -q -b gh-pages', 'dist');
run(`git -c user.name="${name}" -c user.email="${email}" add -A`, 'dist');
run(`git -c user.name="${name}" -c user.email="${email}" commit -q -m "Deploy ${commit}"`, 'dist');
run(`git push -f "${remote}" gh-pages`, 'dist');

console.log('\nDeployed. GitHub Pages updates in about a minute.');
