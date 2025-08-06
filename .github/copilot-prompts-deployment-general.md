# GitHub Copilot Deployment and General Development Prompts

## Deployment Strategies

### GitHub Pages Deployment

This project uses GitHub Pages for frontend deployment. Key considerations:

#### Automatic Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '24'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Build frontend
      run: pnpm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Data File Management

The project requires proper data file management for GitHub Pages:

#### Data File Structure

```
docs/
├── index.html
├── assets/
├── data/
│   ├── starred-repos.json        # Full data (optional for production)
│   └── starred-repos-simple.json # Simplified data (used by frontend)
└── ...
```

#### Data File Deployment Strategy

```typescript
// In action/src/index.ts - Ensure data files are placed correctly
const outputFile = core.getInput('output-file'); // e.g., ./docs/data/starred-repos.json
const simpleOutputFile = core.getInput('simple-output-file'); // e.g., ./docs/data/starred-repos-simple.json

// Ensure the docs/data directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// This ensures data files are deployed with the frontend
```

## Environment Configuration

### Development vs Production Settings

The project behaves differently in development and production:

#### Environment-Specific Configuration

```typescript
// In src/App.tsx
const itemsPerLoad = 10;

// In production environment, use full version; in development, use simplified version
const defaultDataUrl = import.meta.env.PROD 
  ? './data/starred-repos.json' 
  : './data/starred-repos-simple.json';

const dataUrl = atomDataUrl || defaultDataUrl;
```

#### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'docs', // Build to docs directory for GitHub Pages
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          search: ['minisearch'],
          state: ['jotai']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/data': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/data/, '')
      }
    }
  }
})
```

## Performance Optimization

### Build Optimization

Optimize the build for production deployment:

#### Bundle Analysis

```json
// package.json - Add bundle analysis
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build --mode analyze",
    "preview": "vite preview"
  },
  "devDependencies": {
    "rollup-plugin-visualizer": "^5.9.0"
  }
}
```

#### Vite Analyze Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const plugins = [react()]
  
  if (mode === 'analyze') {
    plugins.push(visualizer({
      filename: 'bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }))
  }
  
  return {
    plugins,
    build: {
      outDir: 'docs',
      // ... other config
    }
  }
})
```

### Caching Strategy

Implement proper caching for data files:

#### Cache Headers Configuration

```yaml
# .github/workflows/fetch-starred-repos.yml
- name: Add cache headers
  run: |
    # Add cache headers to data files
    echo "/*" > docs/data/.htaccess
    echo "Header set Cache-Control \"max-age=3600, public\"" >> docs/data/.htaccess
```

#### Service Worker for Offline Support

```typescript
// public/sw.js
const CACHE_NAME = 'github-stars-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/',
  '/data/starred-repos-simple.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
```

## Security Best Practices

### GitHub Action Security

Secure the GitHub Action implementation:

#### Input Validation

```typescript
// In action/src/index.ts
function validateInputs(githubToken: string, username: string, outputFile: string, simpleOutputFile: string): void {
  // Validate GitHub token
  if (!githubToken || githubToken.trim() === '') {
    throw new Error('GitHub token is required');
  }
  
  // Basic token format validation
  if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('gho_')) {
    throw new Error('Invalid GitHub token format');
  }
  
  // Validate username
  if (!username || username.trim() === '') {
    throw new Error('Username is required');
  }
  
  // Username format validation
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(username)) {
    throw new Error('Invalid username format');
  }
  
  // Validate output file paths
  if (!outputFile || outputFile.trim() === '') {
    throw new Error('Output file path is required');
  }
  
  if (!simpleOutputFile || simpleOutputFile.trim() === '') {
    throw new Error('Simple output file path is required');
  }
  
  // Prevent path traversal attacks
  if (outputFile.includes('..') || simpleOutputFile.includes('..')) {
    throw new Error('Invalid file path: path traversal not allowed');
  }
}
```

#### Secret Management

```yaml
# .github/workflows/fetch-starred-repos.yml
name: Fetch Starred Repositories

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:     # Allow manual triggering

jobs:
  fetch:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '24'
        cache: 'pnpm'
    
    - name: Install action dependencies
      run: |
        cd action
        pnpm install
    
    - name: Fetch starred repositories
      uses: ./action
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        username: ${{ github.actor }}
        output-file: ./docs/data/starred-repos.json
        simple-output-file: ./docs/data/starred-repos-simple.json
    
    - name: Commit and push data files
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add docs/data/
        git diff --staged --quiet || git commit -m "Update repository data"
        git push
```

### Frontend Security

Secure the React frontend:

#### Content Security Policy

```html
<!-- index.html -->
<head>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.github.com;
    frame-src 'none';
    object-src 'none';
  ">
</head>
```

#### Environment Variables

```typescript
// src/types/env.d.ts
interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Monitoring and Analytics

### Error Tracking

Implement error tracking for the production application:

#### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send error to monitoring service
    if (import.meta.env.PROD) {
      this.sendErrorToMonitoring(error, errorInfo);
    }
  }

  sendErrorToMonitoring(error: Error, errorInfo: React.ErrorInfo) {
    // Implement error reporting to your monitoring service
    console.log('Error would be sent to monitoring service:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          {this.state.error && (
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### Performance Monitoring

```typescript
// src/utils/monitoring.ts
class PerformanceMonitor {
  private metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
  }> = [];

  measure(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    this.recordMetric(name, end - start);
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    this.recordMetric(name, end - start);
    return result;
  }

  private recordMetric(name: string, value: number): void {
    const metric = {
      name,
      value,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    // Log in development
    if (!import.meta.env.PROD) {
      console.log(`Performance: ${name} took ${value.toFixed(2)}ms`);
    }
    
    // Send to monitoring service in production
    if (import.meta.env.PROD) {
      this.sendToMonitoring(metric);
    }
  }

  private sendToMonitoring(metric: any): void {
    // Implement sending to your monitoring service
    console.log('Metric would be sent to monitoring:', metric);
  }

  getMetrics(): Array<{ name: string; value: number; timestamp: number }> {
    return [...this.metrics];
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## Documentation and Maintenance

### Automated Documentation

Generate and maintain documentation automatically:

#### API Documentation

```typescript
// scripts/generate-docs.ts
import fs from 'fs';
import path from 'path';

interface DocumentationSection {
  title: string;
  content: string;
  code?: string;
}

function generateAPIDocumentation(): void {
  const sections: DocumentationSection[] = [
    {
      title: 'GitHub Stars Search API',
      content: `
This document describes the data structure and API usage for the GitHub Stars Search application.

## Data Structure

The application uses JSON files to store repository data with the following structure:
      `
    },
    {
      title: 'Repository Object',
      content: 'Each repository object contains the following fields:',
      code: `{
  "id": 1,
  "name": "repository-name",
  "full_name": "owner/repository-name",
  "description": "Repository description",
  "language": "PrimaryLanguage",
  "languages": {
    "Language1": {"percentage": "75.5"},
    "Language2": {"percentage": "24.5"}
  },
  "stargazers_count": 100,
  "forks_count": 10,
  "updated_at": "2023-01-01T00:00:00Z",
  "created_at": "2023-01-01T00:00:00Z",
  "starred_at": "2023-01-01T00:00:00Z",
  "topics": ["topic1", "topic2"]
}`
    }
  ];

  let documentation = '# GitHub Stars Search API Documentation\n\n';
  
  sections.forEach(section => {
    documentation += `## ${section.title}\n\n${section.content}\n\n`;
    if (section.code) {
      documentation += `\`\`\`json\n${section.code}\n\`\`\`\n\n`;
    }
  });

  fs.writeFileSync(path.join(__dirname, '../docs/API.md'), documentation);
  console.log('API documentation generated successfully');
}

generateAPIDocumentation();
```

### Change Log Management

Maintain a comprehensive change log:

#### Change Log Template

```markdown
# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature descriptions

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future versions

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security improvements

## [1.0.0] - 2024-01-01

### Added
- Initial release of GitHub Stars Search
- GitHub Action for fetching starred repositories
- React frontend with search and filtering capabilities
- Responsive design for mobile and desktop
- GitHub Pages deployment
```

## Development Workflow

### Pre-commit Hooks

Set up pre-commit hooks for code quality:

#### Husky Configuration

```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,css,scss}",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "husky": "^8.0.3",
    "lint-staged": "^13.2.3",
    "prettier": "^2.8.8",
    "eslint": "^8.42.0"
  }
}
```

#### Pre-commit Configuration

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

### Code Quality Tools

Configure code quality tools:

#### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', '@typescript-eslint', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

#### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Common Development Tasks

### Adding New Features

1. **Planning**: Define the feature requirements and acceptance criteria
2. **Implementation**: Write the code following existing patterns
3. **Testing**: Test the feature thoroughly
4. **Documentation**: Update relevant documentation
5. **Deployment**: Deploy to production

### Bug Fixing Process

1. **Reproduction**: Create a reproducible test case
2. **Identification**: Find the root cause of the bug
3. **Fix**: Implement the fix following best practices
4. **Testing**: Verify the fix works and doesn't break existing functionality
5. **Documentation**: Update documentation if necessary

### Performance Optimization

1. **Profiling**: Identify performance bottlenecks
2. **Optimization**: Implement optimizations
3. **Testing**: Verify improvements and measure impact
4. **Monitoring**: Set up ongoing performance monitoring

### Security Updates

1. **Assessment**: Evaluate security vulnerabilities
2. **Patching**: Apply security patches
3. **Testing**: Verify patches don't break functionality
4. **Documentation**: Update security documentation

## Troubleshooting

### Common Issues and Solutions

#### Build Failures

```bash
# Clear build cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstall dependencies
pnpm install

# Check TypeScript errors
pnpm type-check
```

#### Action Failures

```bash
# Test action locally
cd action
pnpm build
cd ..
node scripts/simulate-action.cjs

# Check GitHub token permissions
# Ensure token has necessary scopes
```

#### Frontend Issues

```bash
# Check console for errors
# Verify data file paths
# Test with different browsers
# Check network requests for data loading
```

### Debug Checklist

- [ ] Check browser console for errors
- [ ] Verify data files are accessible
- [ ] Check network requests in browser dev tools
- [ ] Test with different browsers
- [ ] Verify environment variables
- [ ] Check GitHub Action logs
- [ ] Test with local development setup
- [ ] Review recent changes for potential issues
