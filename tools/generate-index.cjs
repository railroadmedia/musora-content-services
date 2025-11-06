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
 * @returns {string[]}
 */
function extractExportedFunctions(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  const exportFunctionRegex = /\nexport\s+(async\s+)?function\s+(\w+)/g
  const exportVariableRegex = /\nexport\s+(let|const|var)\s+(globalConfig)\s+/g
  const moduleExportsRegex = /module\.exports\s*=\s*{\s*([\s\S]+?)\s*};/g

  let matches = [...fileContent.matchAll(exportFunctionRegex)].map((match) => match[2])

  // Match `globalConfig` variable
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

// get all files in the services directory
const servicesDir = path.join(__dirname, '../src/services')
const treeElements = fs.readdirSync(servicesDir)

function addFunctionsToFileExports(filePath, file) {
  const functionNames = extractExportedFunctions(filePath)

  if (functionNames.length > 0) {
    fileExports[file] = functionNames
  }
}

treeElements.forEach((treeNode) => {
  const filePath = path.join(servicesDir, treeNode)

  if (fs.lstatSync(filePath).isFile()) {
    addFunctionsToFileExports(filePath, treeNode)
  } else if (fs.lstatSync(filePath).isDirectory()) {
    // Skip the permissions directory - it has its own index.ts barrel export
    if (treeNode === 'permissions') {
      return
    }

    const subDir = fs.readdirSync(filePath)
    subDir.forEach((subFile) => {
      const filePath = path.join(servicesDir, treeNode, subFile)
      addFunctionsToFileExports(filePath, treeNode + '/' + subFile)
    })
  }
})

// populate the index.js content string with the import/export of all functions
let content =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, functionNames]) => {
  content += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`
})

// Add permissions barrel export
// Note: UserPermissions, PermissionFilterOptions, ContentItem, and PermissionsVersion are TypeScript types only
// They don't exist at runtime, so we only import the runtime values here
content += `\nimport {\n\tPermissionsAdapter,\n\tPermissionsV1Adapter,\n\tPermissionsV2Adapter,\n\tgetPermissionsAdapter,\n\tgetPermissionsVersion\n} from './services/permissions/index.js';\n`

content += `\nimport {\n\t default as EventsAPI \n} from './services/eventsAPI';\n`

const permissionsExports = [
  'PermissionsAdapter',
  'PermissionsV1Adapter',
  'PermissionsV2Adapter',
  'getPermissionsAdapter',
  'getPermissionsVersion'
]

const allFunctionNames = Object.values(fileExports).flat().concat(permissionsExports).sort()
content += '\nexport {\n'
content += `\t${allFunctionNames.join(',\n\t')},\n`
content += '};\n'

content += '\nexport default EventsAPI\n'

// write the generated content to index.js
const outputPath = path.join(__dirname, '../src/index.js')
fs.writeFileSync(outputPath, content)

console.log('index.js generated successfully!')

// populate the index.d.ts content string with the import and module export of all functions
let dtsContent =
  '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n'

Object.entries(fileExports).forEach(([file, functionNames]) => {
  dtsContent += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`
})

// Add permissions barrel export for .d.ts
// For .d.ts files, we need to export both runtime values AND types
dtsContent += `\nimport {\n\tPermissionsAdapter,\n\tPermissionsV1Adapter,\n\tPermissionsV2Adapter,\n\tgetPermissionsAdapter,\n\tgetPermissionsVersion\n} from './services/permissions/index.js';\n`

// Import TypeScript types separately (these don't exist at runtime)
dtsContent += `\nimport type {\n\tUserPermissions,\n\tPermissionFilterOptions,\n\tContentItem,\n\tPermissionsVersion\n} from './services/permissions/index.js';\n`

dtsContent += `\nimport {\n\t default as EventsAPI \n} from './services/eventsAPI';\n`

dtsContent += "\ndeclare module 'musora-content-services' {\n"
dtsContent += '\texport {\n'
dtsContent += `\t\t${allFunctionNames.join(',\n\t\t')},\n`
dtsContent += '\t}\n'
// Export TypeScript types
dtsContent += '\texport type {\n'
dtsContent += '\t\tUserPermissions,\n'
dtsContent += '\t\tPermissionFilterOptions,\n'
dtsContent += '\t\tContentItem,\n'
dtsContent += '\t\tPermissionsVersion\n'
dtsContent += '\t}\n'
dtsContent += '}\n'

dtsContent += '\nexport default EventsAPI\n'

// write the generated content to index.d.ts
const outputDtsPath = path.join(__dirname, '../src/index.d.ts')
fs.writeFileSync(outputDtsPath, dtsContent)

console.log('index.d.ts generated successfully!')
