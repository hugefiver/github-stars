const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building GitHub Action...');

try {
  // 检查是否已安装依赖
  if (!fs.existsSync('node_modules')) {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // 构建 Action
  console.log('Compiling Action with ncc...');
  execSync('npx ncc build src/index.js -o dist', { stdio: 'inherit' });

  console.log('Build completed successfully!');
  console.log('The compiled Action is available in the dist/ directory.');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
