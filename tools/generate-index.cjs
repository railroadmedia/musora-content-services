/**
 * Tool script to generate index.js and index.d.ts files based on exports from files in our services directory.
 * This scans all files from the src/services directory and retrieves any functions that are declared with
 * `export function` or `export async function`. It also retrieves ES module exports through `module.exports`. *
 */

const fs = require('fs')
const path = require('path')
const fileExports = {}

/**
 * Helper function to extract function names from ES module and CommonJS exports
 *
 * @param {string} filePath
 * @returns {{named: string[], default: string[]}}
 */
function extractExportedFunctions(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  let namedExports = []
  let defaultExports = []

  // 1. Export functions: export function name() or export async function name()
  const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g
  const functionMatches = [...fileContent.matchAll(exportFunctionRegex)].map((match) => match[2])
  namedExports = namedExports.concat(functionMatches)

  // 2. Export variables: export const/let/var name = ...
  const exportVariableRegex = /export\s+(const|let|var)\s+(\w+)/g
  const variableMatches = [...fileContent.matchAll(exportVariableRegex)]
    .map((match) => match[2])
    .filter(name => name !== 'dataContext') // Exclude dataContext as a hack for now
  namedExports = namedExports.concat(variableMatches)

  // 3. Export classes: export class Name and export abstract class Name
  const exportClassRegex = /export\s+(?:abstract\s+)?class\s+(\w+)/g
  const classMatches = [...fileContent.matchAll(exportClassRegex)].map((match) => match[1])
  namedExports = namedExports.concat(classMatches)

  // 4. Re-exports with aliases: export { default as Name } from './module'
  const reExportAliasRegex = /export\s*{\s*default\s+as\s+(\w+)\s*}\s*from/g
  const reExportAliasMatches = [...fileContent.matchAll(reExportAliasRegex)].map((match) => match[1])
  namedExports = namedExports.concat(reExportAliasMatches)

  // 5. Re-exports: export { name1, name2 } from './module'
  const reExportRegex = /export\s*{\s*([^}]+)\s*}\s*from/g
  const reExportMatches = [...fileContent.matchAll(reExportRegex)]
  reExportMatches.forEach((match) => {
    const exports = match[1].split(',').map(exp => {
      // Handle "name as alias" pattern - we want the alias
      const parts = exp.trim().split(/\s+as\s+/)
      return parts.length > 1 ? parts[1].trim() : parts[0].trim()
    })
    namedExports = namedExports.concat(exports)
  })

  // 6. Named exports: export { name1, name2 }
  const namedExportRegex = /export\s*{\s*([^}]+)\s*}(?!\s*from)/g
  const namedExportMatches = [...fileContent.matchAll(namedExportRegex)]
  namedExportMatches.forEach((match) => {
    const exports = match[1].split(',').map(exp => {
      // Handle "name as alias" pattern - we want the alias
      const parts = exp.trim().split(/\s+as\s+/)
      return parts.length > 1 ? parts[1].trim() : parts[0].trim()
    })
    namedExports = namedExports.concat(exports)
  })

  // 7. Default exports - comprehensive pattern matching
  const defaultExportPatterns = [
    /export\s+default\s+function\s+(\w+)/g,           // export default function name
    /export\s+default\s+class\s+(\w+)/g,             // export default class Name
    /export\s+default\s+abstract\s+class\s+(\w+)/g,  // export default abstract class Name
    /export\s+default\s+(?:const|let|var)\s+(\w+)/g, // export default const name
  ]

  defaultExportPatterns.forEach(pattern => {
    const matches_temp = [...fileContent.matchAll(pattern)].map((match) => match[1])
    defaultExports = defaultExports.concat(matches_temp)
  })

  // Handle standalone default identifier exports (but not keywords like function, class, etc.)
  const defaultIdentifierRegex = /export\s+default\s+(?!(?:function|class|const|let|var|async)\s)(\w+)/g
  const defaultIdentifierMatches = [...fileContent.matchAll(defaultIdentifierRegex)].map((match) => match[1])
  defaultExports = defaultExports.concat(defaultIdentifierMatches)

  // 8. CommonJS module.exports (existing pattern) - treat as named exports
  const moduleExportsRegex = /module\.exports\s*=\s*{\s*([\s\S]+?)\s*};/g
  const moduleExportsMatch = moduleExportsRegex.exec(fileContent)
  if (moduleExportsMatch) {
    const exportsList = moduleExportsMatch[1].split(',').map((exp) => exp.split(':')[0].trim())
    namedExports = namedExports.concat(exportsList)
  }

  // Filter out excluded functions and remove duplicates
  const excludedFunctions = getExclusionList(fileContent)
  namedExports = [...new Set(namedExports)].filter((fn) => fn && !excludedFunctions.includes(fn))
  defaultExports = [...new Set(defaultExports)].filter((fn) => fn && !excludedFunctions.includes(fn))

  return {
    named: namedExports.sort(),
    default: defaultExports.sort()
  }
}

/**
 * Helper function to find the list of exclusions from the file's exports
 *
 * @param {string} fileContent
 * @returns {string[]}
 */
function getExclusionList(fileContent) {
  const excludeRegex = /const\s+excludeFromGeneratedIndex\s*=\s*\[(.*?)\];/
  const excludeMatch = fileContent.match(excludeRegex)
  let excludedFunctions = []
  if (excludeMatch) {
    excludedFunctions = excludeMatch[1].split(',').map((name) => name.trim().replace(/['"`]/g, ''))
  }
  return excludedFunctions
}

/**
 * Helper function to add functions to file exports
 *
 * @param {string} filePath - Absolute path to file
 * @param {string} file - Relative path from services directory (for import paths)
 */
function addFunctionsToFileExports(filePath, file) {
  const { named, default: defaultExports } = extractExportedFunctions(filePath)

  if (named.length > 0 || defaultExports.length > 0) {
    fileExports[file] = { named, default: defaultExports }
  }
}

/**
 * Recursively traverse directory and process all files
 * @param {string} dirPath - Absolute path to directory
 * @param {string} relativePath - Relative path from services directory (for import paths)
 */
function traverseDirectory(dirPath, relativePath = '') {
  const items = fs.readdirSync(dirPath)

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item)
    const relativeItemPath = relativePath ? `${relativePath}/${item}` : item

    if (fs.lstatSync(fullPath).isFile()) {
      addFunctionsToFileExports(fullPath, relativeItemPath)
    } else if (fs.lstatSync(fullPath).isDirectory()) {
      traverseDirectory(fullPath, relativeItemPath)
    }
  })
}

// get all files in the services directory
const servicesDir = path.join(__dirname, '../src/services')

// Traverse the services directory recursively
traverseDirectory(servicesDir)

// populate the index.js content string with the import/export of all functions
let content =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, { named, default: defaultExports }]) => {
  if (named.length > 0) {
    content += `\nimport { ${named.join(', ')} } from './services/${file}';\n`
  }
  if (defaultExports.length > 0) {
    content += `\nimport ${defaultExports[0]} from './services/${file}';\n`
  }
})

content += `\nimport {\n\t default as EventsAPI \n} from './services/eventsAPI';\n`

const allNamedExports = Object.values(fileExports).flatMap(({ named }) => named).sort()
const allDefaultExports = Object.values(fileExports).flatMap(({ default: defaultExports }) => defaultExports).sort()
content += '\nexport {\n'
content += `\t${allNamedExports.join(',\n\t')},\n`
content += `\t${allDefaultExports.join(',\n\t')},\n`
content += '};\n'

content += '\nexport default EventsAPI\n'

// write the generated content to index.js
const outputPath = path.join(__dirname, '../src/index.js')
fs.writeFileSync(outputPath, content)

console.log('index.js generated successfully!')

// populate the index.d.ts content string with the import and module export of all functions
let dtsContent =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, { named, default: defaultExports }]) => {
  if (named.length > 0) {
    dtsContent += `\nimport { ${named.join(', ')} } from './services/${file}';\n`
  }
  if (defaultExports.length > 0) {
    dtsContent += `\nimport ${defaultExports[0]} from './services/${file}';\n`
  }
})

dtsContent += `\nimport {\n\t default as EventsAPI \n} from './services/eventsAPI';\n`

dtsContent += "\ndeclare module 'musora-content-services' {\n"
dtsContent += '\texport {\n'
dtsContent += `\t\t${allNamedExports.join(',\n\t\t')},\n`
dtsContent += `\t\t${allDefaultExports.join(',\n\t\t')},\n`
dtsContent += '\t}\n'
dtsContent += '}\n'

dtsContent += '\nexport default EventsAPI\n'

// write the generated content to index.d.ts
const outputDtsPath = path.join(__dirname, '../src/index.d.ts')
fs.writeFileSync(outputDtsPath, dtsContent)

console.log('index.d.ts generated successfully!')
