import * as core from '@actions/core';
import { loadConfig, validateConfig } from './modules/config';
import { processStarredRepositories } from './modules/core';
import { getErrorMessage } from './modules/errorHandler';

async function run(): Promise<void> {
  try {
    const config = loadConfig();

    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      core.setFailed(`Configuration validation failed: ${validationErrors.join(', ')}`);
      return;
    }

    await processStarredRepositories(config);
  } catch (error: unknown) {
    core.setFailed(`Action failed: ${getErrorMessage(error)}`);
  }
}

run();
