import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '..');
const output = join(directory, 'public');
const catalog = JSON.parse(readFileSync(join(root, 'app/film-catalog.json'), 'utf8'));
for (const metadata of Object.values(catalog)) {
  const path = join(root, 'public', metadata.poster.replace(/^\//, ''));
  const image = await sharp(path).resize({ width: 250, withoutEnlargement: true }).webp({ quality: 64, effort: 5 }).toBuffer();
  metadata.poster = 'data:image/webp;base64,' + image.toString('base64');
  delete metadata.source;
}
const backgroundImage = await sharp(join(root, 'public/elven-valley.webp'))
  .resize({ width: 1500, withoutEnlargement: true }).webp({ quality: 58, effort: 5 }).toBuffer();
const background = 'data:image/webp;base64,' + backgroundImage.toString('base64');
const page = readFileSync(join(root, 'google-apps-script/Index.template.html'), 'utf8')
  .replace('__BACKGROUND_DATA__', background)
  .replace('__CATALOG_JSON__', JSON.stringify(catalog))
  .replace('<base target="_top">', '<base target="_self">')
  .replace('  <script>\n    const CATALOG', '  <script src="./bridge-client.js"></script>\n  <script>\n    const CATALOG');
if (page.includes('__BACKGROUND_DATA__') || page.includes('__CATALOG_JSON__') ||
    !page.includes('<script src="./bridge-client.js"></script>')) throw new Error('Firebase page assembly failed.');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'index.html'), page);
copyFileSync(join(directory, 'bridge-client.js'), join(output, 'bridge-client.js'));
console.log(`Firebase page ready: ${Math.round(page.length / 1024)} KB. No access code in public files.`);
