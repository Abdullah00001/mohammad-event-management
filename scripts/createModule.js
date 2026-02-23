const fs = require('fs');
const path = require('path');

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Please provide a module name.');
  process.exit(1);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const folderPath = path.join(
  process.cwd(),
  'src',
  'app',
  'modules',
  moduleName
);

const files = {
  [`${moduleName}.controllers.ts`]: '',
  [`${moduleName}.services.ts`]: '',
  [`${moduleName}.middlewares.ts`]: '',
  [`${moduleName}.routes.ts`]: '',
  [`${moduleName}.schemas.ts`]: '',
  [`${moduleName}.model.ts`]: '',
  [`${moduleName}.dto.ts`]: '',
  [`${moduleName}.types.ts`]: '',
};

if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath, { recursive: true });
  console.log(`📁 Created folder: ${moduleName}`);
} else {
  console.log(`📁 Folder already exists: ${moduleName}`);
}

Object.entries(files).forEach(([fileName, content]) => {
  const filePath = path.join(folderPath, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, { flag: 'w' });
    console.log(`📄 Created file: ${fileName}`);
  } else {
    console.log(`⚠️  File already exists: ${fileName}`);
  }
});

console.log(`✅ Module '${moduleName}' setup complete.`);
