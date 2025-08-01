const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function buildAction() {
  try {
    // 确保dist目录存在
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    // 使用tsc编译TypeScript
    console.log('Compiling TypeScript...');
    execSync('npx tsc --project .', { stdio: 'inherit' });

    // 使用ncc打包
    console.log('Bundling with ncc...');
    execSync('ncc build dist/index.js -o dist-bundle', { stdio: 'inherit' });

    // 移动打包后的文件到dist目录
    console.log('Moving bundled files...');
    const bundledFiles = fs.readdirSync('dist-bundle');
    bundledFiles.forEach(file => {
      fs.renameSync(path.join('dist-bundle', file), path.join('dist', file));
    });
    
    // 删除临时目录
    fs.rmSync('dist-bundle', { recursive: true, force: true });

    // 清理中间文件
    console.log('Cleaning up intermediate files...');
    if (fs.existsSync('dist/index.js')) {
      fs.unlinkSync('dist/index.js');
    }
    if (fs.existsSync('dist/index.d.ts')) {
      fs.unlinkSync('dist/index.d.ts');
    }
    if (fs.existsSync('dist/index.js.map')) {
      fs.unlinkSync('dist/index.js.map');
    }

    console.log('Action built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAction();
