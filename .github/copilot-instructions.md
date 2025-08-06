# GitHub Copilot Instructions for GitHub Stars Search

## Project Overview

This is a comprehensive GitHub Stars Search application that consists of two main components:

1. **GitHub Action Backend** (`action/`): Automatically fetches starred repositories from GitHub API using GraphQL
2. **React Frontend** (`src/`): Displays and allows searching/filtering of starred repositories

The application automatically syncs GitHub starred repositories daily and provides a responsive web interface for browsing and searching through them.

## Technology Stack

### Backend (GitHub Action)
- **Runtime**: Node.js 24
- **GitHub API**: GraphQL with Octokit
- **Authentication**: GitHub token
- **Rate Limiting**: Intelligent handling with exponential backoff
- **Output**: JSON files (full and simplified versions)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Jotai atoms
- **Search**: MiniSearch for performant client-side search
- **Styling**: SCSS with responsive design
- **Deployment**: GitHub Pages

### Development
- **Package Manager**: pnpm
- **TypeScript**: Strict type checking
- **Testing**: Manual testing with simulation scripts

## Project Structure

```
github-stars-search/
├── .github/
│   ├── workflows/           # GitHub Actions workflows
│   └── copilot-instructions.md # This file
├── action/                  # GitHub Action source code
│   ├── src/
│   │   ├── index.ts        # Main action logic
│   │   └── types/          # TypeScript definitions
│   ├── action.yml          # Action configuration
│   └── package.json
├── src/                    # Frontend source code
│   ├── App.tsx            # Main React component
│   ├── types.ts           # Frontend type definitions
│   ├── store/             # Jotai state management
│   └── ...
├── docs/                   # Built frontend and data files
├── data/                   # Raw data files
├── scripts/               # Testing and simulation scripts
└── package.json
```

## Key Architecture Patterns

### Data Flow
1. **GitHub Action** fetches data from GitHub API
2. **Full data** saved as `starred-repos.json`
3. **Simplified data** saved as `starred-repos-simple.json`
4. **Frontend** loads simplified data for display
5. **Client-side search** using MiniSearch

### State Management (Frontend)
- **Persistent settings**: Jotai atoms (sortBy, sortOrder, showSettings, etc.)
- **Transient state**: useState (searchTerm, selectedLanguage, selectedTag)
- **Search index**: MiniSearch instance for performant searching

### Error Handling
- **Action**: Rate limit handling with intelligent retries
- **Frontend**: Graceful error display and loading states
- **API**: Comprehensive error logging and user feedback

## Coding Standards

### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Use proper null checking and optional chaining
- Leverage TypeScript's type inference where appropriate

### React
- Use functional components with hooks
- Implement proper dependency arrays in useEffect
- Use useMemo for expensive computations
- Keep components focused and single-purpose

### GraphQL
- Use typed queries with proper variable definitions
- Handle pagination with cursor-based approach
- Implement rate limit awareness
- Use field aliases for clarity

### GitHub Action Development
- Use proper input/output definitions
- Implement comprehensive error handling
- Use core.setFailed for action failures
- Log progress with console.log

## Development Workflow

### Setting Up Development Environment
```bash
# Clone repository
git clone https://github.com/hugefiver/github-stars-search.git
cd github-stars-search

# Install dependencies
pnpm install

# Install action dependencies
cd action
pnpm install
cd ..

# Start development server
pnpm run dev
```

### Building and Testing
```bash
# Build frontend
pnpm run build

# Build action
cd action
pnpm run build

# Test action locally
node ../scripts/simulate-action.cjs
```

### Deployment
- Frontend automatically deploys to GitHub Pages
- Action runs daily to fetch new data
- Manual triggers available for immediate updates

## Important File Relationships

### Data Structures
- `action/src/types/github.ts`: GraphQL API response types
- `src/types.ts`: Frontend data types
- Data flows from Action types → Frontend types with simplification

### Configuration Files
- `action/action.yml`: Action input/output definitions
- `package.json`: Frontend dependencies and scripts
- `action/package.json`: Action dependencies and scripts

### State Management
- `src/store/atoms.ts`: Jotai atom definitions
- State persistence across page reloads for user preferences

## Common Development Tasks

### Adding New Search Filters
1. Update filter state in `App.tsx`
2. Add filter UI components
3. Modify search logic in `filteredAndSortedRepos`
4. Update type definitions if needed

### Modifying GraphQL Query
1. Update query in `action/src/index.ts`
2. Update TypeScript interfaces in `action/src/types/github.ts`
3. Update data processing logic
4. Test with simulation scripts

### Styling Changes
1. Modify SCSS files in `src/`
2. Use responsive design patterns
3. Test on multiple screen sizes
4. Consider accessibility implications

## Performance Considerations

### Frontend Optimization
- Use MiniSearch for efficient client-side search
- Implement virtual scrolling for large datasets
- Use useMemo for expensive computations
- Lazy load non-critical components

### Action Optimization
- Implement intelligent rate limiting
- Use pagination for large datasets
- Minimize API calls with efficient queries
- Handle edge cases gracefully

## Testing Guidelines

### Action Testing
- Use simulation scripts in `scripts/` directory
- Test with various repository sizes
- Verify rate limit handling
- Test error scenarios

### Frontend Testing
- Test search functionality with various queries
- Verify filter combinations work correctly
- Test responsive design on different devices
- Validate data loading and error states

## Contributing

When contributing to this project:
1. Follow the existing code patterns and conventions
2. Update type definitions when changing data structures
3. Test changes thoroughly before submitting
4. Update documentation as needed
5. Ensure both frontend and action work correctly

## GitHub Copilot Usage Tips

### For Frontend Development
- Use existing component patterns as reference
- Leverage Jotai atoms for persistent state
- Follow TypeScript type definitions strictly
- Use MiniSearch for search-related functionality

### For Action Development
- Follow GraphQL query patterns
- Implement proper error handling
- Use the existing rate limiting approach
- Test with simulation scripts

### General Tips
- Refer to existing code for patterns
- Use the project's established conventions
- Consider performance implications
- Maintain type safety throughout
