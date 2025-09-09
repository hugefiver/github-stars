import * as core from '@actions/core';
import { loadConfig, validateConfig } from './modules/config';
import { processStarredRepositories } from './modules/core';

async function run(): Promise<void> {
  try {
    // 加载配置
    const config = loadConfig();
    
    // 验证配置
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      core.setFailed(`Configuration validation failed: ${validationErrors.join(', ')}`);
      return;
    }
    
    // 处理starred repositories
    await processStarredRepositories(config);
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();