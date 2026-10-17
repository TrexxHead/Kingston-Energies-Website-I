// Copies MapLibre's web-worker files into public/ so the Kingston map can load
// them same-origin (allowed by the site CSP's worker-src 'self'). Runs on
// install and before each build; the folder is versioned so a MapLibre
// upgrade never mixes a new main bundle with an old cached worker.
const fs = require('fs')
const path = require('path')

const pkgDir = path.dirname(require.resolve('maplibre-gl/package.json'))
const { version } = require(path.join(pkgDir, 'package.json'))
const outRoot = path.join(__dirname, '..', 'public', 'maps', 'vendor')
const outDir = path.join(outRoot, `maplibre-${version}`)

fs.rmSync(outRoot, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(pkgDir, 'dist', f), path.join(outDir, f))
}
console.log(`maplibre worker ${version} → public/maps/vendor/maplibre-${version}/`)
