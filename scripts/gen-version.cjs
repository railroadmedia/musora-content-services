const fs = require('fs')
const path = require('path')

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

const outPath = path.join(__dirname, '../src/version-info.js')
fs.writeFileSync(outPath, `export const MCS_VERSION = '${pkg.version}'\n`)
