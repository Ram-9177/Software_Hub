import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'apps/web/dist');

if (!fs.existsSync(distDir)) {
  console.error('apps/web/dist does not exist! Please build first.');
  process.exit(1);
}

// Make sure 404.html exists for SPA fallback
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
if (fs.existsSync(indexPath) && !fs.existsSync(notFoundPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
}

console.log('Deploying dist contents to gh-pages branch...');

// Use a separate git directory or temporary branch
const tempIndex = path.resolve(rootDir, '.git/gh-pages-index');
if (fs.existsSync(tempIndex)) {
  fs.unlinkSync(tempIndex);
}

const env = {
  ...process.env,
  GIT_WORK_TREE: distDir,
  GIT_INDEX_FILE: tempIndex,
};

// Add all files from apps/web/dist to the temporary index
execSync('git add -A', { cwd: rootDir, env, stdio: 'inherit' });

// Write the tree
const treeHash = execSync('git write-tree', { cwd: rootDir, env }).toString().trim();
console.log('Tree hash:', treeHash);

// Create a commit
const commitMessage = 'Deploy updated Command Center rebuild to GitHub Pages';
const commitHash = execSync(`git commit-tree ${treeHash} -m "${commitMessage}"`, {
  cwd: rootDir,
  env,
}).toString().trim();
console.log('Commit hash:', commitHash);

// Push directly to origin/gh-pages
console.log('Pushing to origin gh-pages...');
execSync(`git push origin ${commitHash}:refs/heads/gh-pages --force`, {
  cwd: rootDir,
  stdio: 'inherit',
});

// Clean up temp index
if (fs.existsSync(tempIndex)) {
  fs.unlinkSync(tempIndex);
}

console.log('Successfully deployed to gh-pages branch!');
