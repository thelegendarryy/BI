const fs = require('fs');
const path = require('path');

const SCAN_DIRS = [
  path.join(__dirname, '..', 'src', 'app'),
  path.join(__dirname, '..', 'src', 'components'),
  path.join(__dirname, '..', 'src', 'lib'),
  path.join(__dirname, '..', 'src', 'context'),
  path.join(__dirname, '..', 'src', 'hooks')
];

const SCAN_KEYWORDS = [
  'mock',
  'fallback',
  'static',
  'dummy',
  'demo',
  'placeholder',
  'hardcoded',
  'sampleData',
  'testData',
  'fake',
  'localData',
  'staticFallback',
  'mockData',
  'chartData',
  'DEFAULT_DATA',
  'TODO',
  'FIXME'
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, idx) => {
    SCAN_KEYWORDS.forEach(kw => {
      // Avoid matching imports of libraries or standard react features
      if (line.toLowerCase().includes(kw.toLowerCase())) {
        // Exclude standard imports or false positives
        if (
          line.includes('lucide-react') || 
          line.includes('next/server') || 
          line.includes('Suspense fallback') ||
          line.includes('staticFallback') && filePath.endsWith('route.ts') // exclude the word staticFallback in routes if it's just a comment
        ) {
          return;
        }
        matches.push({
          lineNumber: idx + 1,
          keyword: kw,
          lineContent: line.trim()
        });
      }
    });
  });

  return matches;
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function main() {
  console.log('============================================================');
  console.log('Vertex SalesCube BI - Static Data Reference Audit Scan');
  console.log('============================================================');
  
  let allFiles = [];
  SCAN_DIRS.forEach(d => {
    allFiles = allFiles.concat(walkDir(d));
  });

  console.log(`Scanning ${allFiles.length} source files...`);
  console.log('------------------------------------------------------------');

  let totalReferences = 0;
  const fileReports = [];

  allFiles.forEach(f => {
    const relativePath = path.relative(path.join(__dirname, '..'), f);
    const matches = scanFile(f);
    if (matches.length > 0) {
      totalReferences += matches.length;
      fileReports.push({
        file: relativePath,
        matches
      });
      console.log(`\n📄 ${relativePath} (${matches.length} references found):`);
      matches.forEach(m => {
        console.log(`  Line ${m.lineNumber} [${m.keyword}]: "${m.lineContent}"`);
      });
    }
  });

  console.log('\n============================================================');
  console.log('AUDIT SUMMARY');
  console.log('============================================================');
  console.log(`Total files with static references: ${fileReports.length}`);
  console.log(`Total static/mock references found: ${totalReferences}`);
  console.log('============================================================');
}

main();
