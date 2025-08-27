const fs = require('fs')
const path = require('path')
const fileExports = {}

/**
 * Helper function to extract function names from ES module and CommonJS exports
 *
 * @param {string} filePath
 * @returns {string[]}
 */
function extractExportedFunctions(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g
  const exportVariableRegex = /export\s+(let|const|var)\s+(globalConfig)\s+/g
  const moduleExportsRegex = /module\.exports\s*=\s*{\s*([\s\S]+?)\s*};/g

  let matches = [...fileContent.matchAll(exportFunctionRegex)].map((match) => match[2])

  const variableMatches = [...fileContent.matchAll(exportVariableRegex)].map((match) => match[2])
  matches = matches.concat(variableMatches)

  const moduleExportsMatch = moduleExportsRegex.exec(fileContent)
  if (moduleExportsMatch) {
    const exportsList = moduleExportsMatch[1].split(',').map((exp) => exp.split(':')[0].trim())
    matches = matches.concat(exportsList)
  }

  const excludedFunctions = getExclusionList(fileContent)
  matches = matches.filter((fn) => !excludedFunctions.includes(fn))

  return matches.sort()
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
 * Recursively scan a directory for files, skipping directories with .indexignore
 *
 * @param {string} dir
 * @returns {string[]} array of file paths
 */
function getAllFiles(dir) {
  if (fs.existsSync(path.join(dir, '.indexignore'))) {
    return [] // skip this directory entirely
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

// get all JS files in the services directory
const servicesDir = path.join(__dirname, '../src/services')
const allFiles = getAllFiles(servicesDir)

allFiles.forEach((filePath) => {
  const relativeFile = path.relative(servicesDir, filePath).replace(/\\/g, '/')
  const functionNames = extractExportedFunctions(filePath)
  if (functionNames.length > 0) {
    fileExports[relativeFile] = functionNames
  }
})

// generate index.js
let content =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, functionNames]) => {
  content += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`
})

const allFunctionNames = Object.values(fileExports).flat().sort()
content += '\nexport {\n'
content += `\t${allFunctionNames.join(',\n\t')},\n`
content += '};\n'

fs.writeFileSync(path.join(__dirname, '../src/index.js'), content)
console.log('index.js generated successfully!')

// generate index.d.ts
let dtsContent =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, functionNames]) => {
  dtsContent += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`
})

dtsContent += "\ndeclare module 'musora-content-services' {\n"
dtsContent += '\texport {\n'
dtsContent += `\t\t${allFunctionNames.join(',\n\t\t')},\n`
dtsContent += '\t}\n'
dtsContent += '}\n'

fs.writeFileSync(path.join(__dirname, '../src/index.d.ts'), dtsContent)
console.log('index.d.ts generated successfully!')
