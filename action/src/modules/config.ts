import * as core from '@actions/core';

// 配置接口
export interface AppConfig {
  githubToken: string;
  username: string;
  outputFile: string;
  simpleOutputFile: string;
  batchSize: number;
  initialRequestSize: number;
  minRequestSize: number;
  maxRetries: number;
  retryDelays: number[];
  requestDelay: number;
}

// 默认配置
export const defaultConfig: AppConfig = {
  githubToken: '',
  username: '',
  outputFile: './starred-repos.json',
  simpleOutputFile: './starred-repos-simple.json',
  batchSize: 70,
  initialRequestSize: 70,
  minRequestSize: 1,
  maxRetries: 5,
  retryDelays: [5000, 10000, 30000], // 5s, 10s, 30s
  requestDelay: 2000 // 2s
};

// 从环境变量和输入参数加载配置
export function loadConfig(): AppConfig {
  // 获取输入参数
  const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
  const username = core.getInput('username');
  const outputFile = core.getInput('output-file') || defaultConfig.outputFile;
  const simpleOutputFile = core.getInput('simple-output-file') || defaultConfig.simpleOutputFile;
  const batchSizeInput = parseInt(core.getInput('batch-size')) || defaultConfig.batchSize;
  
  // 限制batchSize在合理范围内
  const batchSize = Math.min(Math.max(batchSizeInput, 10), 100);
  
  return {
    ...defaultConfig,
    githubToken,
    username,
    outputFile,
    simpleOutputFile,
    batchSize,
    initialRequestSize: batchSize
  };
}

// 验证配置
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  
  if (!config.githubToken) {
    errors.push('GitHub token is required');
  }
  
  if (!config.username) {
    errors.push('Username is required');
  }
  
  if (config.batchSize < 1 || config.batchSize > 100) {
    errors.push('Batch size must be between 1 and 100');
  }
  
  if (config.minRequestSize < 1) {
    errors.push('Min request size must be at least 1');
  }
  
  if (config.initialRequestSize < config.minRequestSize) {
    errors.push('Initial request size must be greater than or equal to min request size');
  }
  
  if (config.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }
  
  return errors;
}