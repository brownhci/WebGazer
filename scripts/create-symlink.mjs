// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../dist');
const nodeModulesDir = path.resolve(__dirname, '../node_modules');
const targetDir = path.resolve(__dirname, '../www/lib');

const files = [
  { source: sourceDir, name: 'webgazer.es.js', symlink: 'webgazer.js' },
  { source: sourceDir, name: 'webgazer.es.js.map', symlink: 'webgazer.js.map' },
  { source: sourceDir, name: 'ridgeWorker.worker.js', symlink: 'ridgeWorker.worker.js' },
  { source: path.join(nodeModulesDir, 'bootstrap/dist/js'), name: 'bootstrap.bundle.min.js', symlink: 'bootstrap.bundle.min.js' },
  { source: path.join(nodeModulesDir, 'bootstrap/dist/css'), name: 'bootstrap.min.css', symlink: 'bootstrap.min.css' },
  { source: path.join(nodeModulesDir, 'heatmap.js/build'), name: 'heatmap.min.js', symlink: 'heatmap.min.js' },
  { source: path.join(nodeModulesDir, 'sweetalert/js/build'), name: 'sweetalert.min.js', symlink: 'sweetalert.min.js' },
  { source: path.resolve(sourceDir, 'types'), name: 'index.d.ts', symlink: 'webgazer.d.ts' }
];

const createSymlink = (source, target) => {
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }

    // Create new symlink
    fs.symlinkSync(source, target, 'file');
    console.log(`Symlink created successfully: ${target}`);
  } catch (error) {
    console.error(`Error creating symlink for ${target}:`, error);
  }
};

// Ensure the target directories exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Create symlinks for each file
files.forEach(file => {
  const source = path.join(file.source, file.name);
  const target = path.join(targetDir, file.symlink);
  createSymlink(source, target);
});
