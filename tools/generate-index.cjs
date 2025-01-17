/**
 * Tool script to generate index.js and index.d.ts files based on exports from files in our services directory.
 * This scans all files from the src/services directory and retrieves any functions that are declared with
 * `export function` or `export async function`. It also retrieves ES module exports through `module.exports`. *
 */

const fs = require('fs');
const path = require('path');
const fileExports = {};

/**
 * Helper function to extract function names from ES module and CommonJS exports
 *
 * @param {string} filePath
 * @returns {string[]}
 */
function extractExportedFunctions(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    const exportVariableRegex = /export\s+(let|const|var)\s+(globalConfig)\s+/g;  // Corrected regex
    const moduleExportsRegex = /module\.exports\s*=\s*{\s*([\s\S]+?)\s*};/g;

    let matches = [...fileContent.matchAll(exportFunctionRegex)].map(match => match[2]);

    // Match `globalConfig` variable
    const variableMatches = [...fileContent.matchAll(exportVariableRegex)].map(match => match[2]);
    matches = matches.concat(variableMatches);


    const moduleExportsMatch = moduleExportsRegex.exec(fileContent);
    if (moduleExportsMatch) {
        const exportsList = moduleExportsMatch[1]
            .split(',')
            .map(exp => exp.split(':')[0].trim());
        matches = matches.concat(exportsList);
    }

    const excludedFunctions = getExclusionList(fileContent);
    matches = matches.filter(fn => !excludedFunctions.includes(fn));

    return matches.sort();
}

/**
 * Helper function to find the list of exclusions from the file's exports
 *
 * @param {string} fileContent
 * @returns {string[]}
 */
function getExclusionList(fileContent) {
    const excludeRegex = /const\s+excludeFromGeneratedIndex\s*=\s*\[(.*?)\];/;
    const excludeMatch = fileContent.match(excludeRegex);
    let excludedFunctions = [];
    if (excludeMatch) {
        excludedFunctions = excludeMatch[1]
            .split(',')
            .map(name => name.trim().replace(/['"`]/g, ''));
    }
    return excludedFunctions;
}

// get all files in the services directory
const servicesDir = path.join(__dirname, '../src/services');
const files = fs.readdirSync(servicesDir);

files.forEach((file) => {
    const filePath = path.join(servicesDir, file);
    const functionNames = extractExportedFunctions(filePath);

    if (functionNames.length > 0) {
        fileExports[file] = functionNames;
    }
});

// populate the index.js content string with the import/export of all functions
let content = '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n';

Object.entries(fileExports).forEach(([file, functionNames]) => {
    content += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`;
});

const allFunctionNames = Object.values(fileExports).flat().sort();
content += '\nexport {\n';
content += `\t${allFunctionNames.join(',\n\t')},\n`;
content += '};\n';

// write the generated content to index.js
const outputPath = path.join(__dirname, '../src/index.js');
fs.writeFileSync(outputPath, content);

console.log('index.js generated successfully!');

// populate the index.d.ts content string with the import and module export of all functions
let dtsContent = '/*** This file was generated automatically. To recreate, please run `npm run build-index`. ***/\n';

Object.entries(fileExports).forEach(([file, functionNames]) => {
    dtsContent += `\nimport {\n\t${functionNames.join(',\n\t')}\n} from './services/${file}';\n`;
});

dtsContent += '\ndeclare module \'musora-content-services\' {\n';
dtsContent += '\texport {\n';
dtsContent += `\t\t${allFunctionNames.join(',\n\t\t')},\n`;
dtsContent += '\t}\n';
dtsContent += '}\n';

// write the generated content to index.d.ts
const outputDtsPath = path.join(__dirname, '../src/index.d.ts');
fs.writeFileSync(outputDtsPath, dtsContent);

console.log('index.d.ts generated successfully!');
