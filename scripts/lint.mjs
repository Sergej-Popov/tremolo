import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const nodeBinDir = path.dirname(process.execPath);
const nodeRoot = path.resolve(nodeBinDir, '..');
const typescriptModulePath = pathToFileURL(
  path.join(nodeRoot, 'lib', 'node_modules', 'typescript', 'lib', 'typescript.js')
).href;
const ts = await import(typescriptModulePath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tremolo-lint-'));

const compilerOptions = {
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function processFile(srcPath, destPath) {
  const ext = path.extname(srcPath);
  if (ext === '.ts' || ext === '.tsx') {
    if (srcPath.endsWith('.d.ts')) {
      return;
    }
    const code = await fs.readFile(srcPath, 'utf8');
    const transpiled = ts.transpileModule(code, { compilerOptions });
    const outputPath = destPath.replace(/\.tsx?$/, '.js');
    await ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, transpiled.outputText, 'utf8');
    return;
  }

  if (ext === '.js' || ext === '.jsx') {
    const code = await fs.readFile(srcPath, 'utf8');
    await ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, code, 'utf8');
    return;
  }
}

async function traverse(currentSrc, currentDest) {
  const entries = await fs.readdir(currentSrc, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(currentSrc, entry.name);
    const destPath = path.join(currentDest, entry.name);
    if (entry.isDirectory()) {
      await traverse(srcPath, destPath);
    } else {
      await processFile(srcPath, destPath);
    }
  }
}

try {
  await traverse(srcDir, tempDir);
  const lintConfig = `export default [\n  {\n    ignores: ['**/*.d.ts'],\n  },\n  {\n    files: ['**/*.js', '**/*.jsx'],\n    languageOptions: {\n      ecmaVersion: 2020,\n      sourceType: 'module',\n      parserOptions: {\n        ecmaFeatures: {\n          jsx: true,\n        },\n      },\n      globals: {\n        Blob: 'readonly',\n        CustomEvent: 'readonly',\n        Event: 'readonly',\n        FileReader: 'readonly',\n        Image: 'readonly',\n        PointerEvent: 'readonly',\n        SVGElement: 'readonly',\n        URL: 'readonly',\n        XMLSerializer: 'readonly',\n        cancelAnimationFrame: 'readonly',\n        clearInterval: 'readonly',\n        clearTimeout: 'readonly',\n        console: 'readonly',\n        crypto: 'readonly',\n        document: 'readonly',\n        fetch: 'readonly',\n        localStorage: 'readonly',\n        navigator: 'readonly',\n        performance: 'readonly',\n        prompt: 'readonly',\n        requestAnimationFrame: 'readonly',\n        setInterval: 'readonly',\n        setTimeout: 'readonly',\n        window: 'readonly',\n      },\n    },\n    rules: {\n      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],\n      'no-undef': 'error',\n      'no-unreachable': 'error',\n      'no-console': 'warn',\n    },\n  },\n];\n`;
  await fs.writeFile(path.join(tempDir, 'eslint.config.js'), lintConfig, 'utf8');
  if (process.env.KEEP_LINT_TEMP === '1') {
    console.log(`Lint temp directory: ${tempDir}`);
  }
  execSync('eslint .', {
    cwd: tempDir,
    stdio: 'inherit',
  });
} finally {
  if (process.env.KEEP_LINT_TEMP !== '1') {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
