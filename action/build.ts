import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function buildAction(): Promise<void> {
  try {
    // 确保dist目录存在
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }

    // 使用ncc直接打包TypeScript文件（推荐方式）
    console.log('Bundling with ncc...');
    execSync('ncc build src/index.ts -o dist --minify', { stdio: 'inherit' });

    console.log('Action built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAction();
