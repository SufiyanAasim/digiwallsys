const fs = require('fs');
const path = require('path');

function replaceInDir(dir, componentPathPrefix) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.js') || file === 'TouchableOpacity.js') continue;
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"]\s*;/;
    const match = content.match(importRegex);

    if (match) {
      let imports = match[1];
      if (imports.includes('TouchableOpacity')) {
        imports = imports.replace(/\bTouchableOpacity\b/g, '')
                         .replace(/,\s*,/g, ',')
                         .replace(/^\s*,\s*/, '')
                         .replace(/\s*,\s*$/, '');
        
        let newImportStatement = imports.trim() === '' ? '' : `import { ${imports} } from 'react-native';`;
        content = content.replace(match[0], newImportStatement);
        
        const customImport = `import TouchableOpacity from '${componentPathPrefix}TouchableOpacity';\n`;
        // insert after React imports or at top
        const firstImport = content.match(/^import.*?;/m);
        if (firstImport) {
             content = content.replace(firstImport[0], firstImport[0] + '\n' + customImport);
        } else {
             content = customImport + content;
        }
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'screens'), '../components/');
replaceInDir(path.join(__dirname, 'components'), './');
console.log('Done.');
