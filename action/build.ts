import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function buildAction(): Promise<void> {
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
    execSync('ncc build index.ts -o dist', { stdio: 'inherit' });

    console.log('Action built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAction();
