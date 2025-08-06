# GitHub Stars Search - AI Coding Instructions

## Architecture Overview

This is a dual-component system that automatically fetches and displays GitHub starred repositories:

1. **GitHub Action** (`/action/`) - Fetches data via GraphQL API, outputs structured JSON
2. **React Frontend** (`/src/`) - Provides search/filter UI using the JSON data

**Data Flow**: GitHub GraphQL API → Action → JSON files → Frontend → User Interface

## Critical Development Workflows

### Frontend Development
```bash
npm install && npm run dev    # Start Vite dev server
npm run build                 # Production build → dist/
```

### GitHub Action Development  
```bash
cd action && npm install && npm run build  # Compiles TypeScript → dist/index.js using ncc
```

### Testing Action Logic
```bash
node scripts/test-graphql-query.cjs     # Test GraphQL queries
node scripts/simulate-action.cjs        # Full action simulation
```

## Project-Specific Patterns

### State Management (Jotai)
- All app state lives in `/src/store/atoms.ts` using Jotai atoms
- Example: `const [sortBy, setSortBy] = useAtom(sortByAtom)`
- Persistent state uses `atomWithStorage` for localStorage persistence
- No Redux/Context - pure atomic state management

### Search Implementation (MiniSearch)
- Search index built in `App.tsx` using MiniSearch library
- Indexes: `name`, `full_name`, `description`, `language`, `topics`
- Boost weights: name/full_name (2x), topics (1.5x)
- Supports fuzzy matching and prefix search

### Data Structure Transformation
```typescript
// Action outputs two formats:
// 1. Full: starred-repos.json (complete GraphQL data)
// 2. Simplified: starred-repos-simple.json (frontend optimized)

// Frontend uses simplified format for performance:
interface Repository {
  id: number;
  languages?: Record<string, { percentage: string }>;  // Key pattern
  topics: string[];
  // ... other fields
}
```

### TypeScript Patterns
- Comprehensive type definitions in `/src/types.ts`
- GraphQL types in `/action/src/types/github.ts`
- Strict typing for API responses and UI components

## Critical Integration Points

### GitHub Action Configuration
- Entry point: `/action/action.yml` defines inputs/outputs
- Main logic: `/action/src/index.ts` with rate limiting & pagination
- Build artifact: `/action/dist/index.js` (committed to repo)

### CI/CD Pipeline (`.github/workflows/fetch-starred-repos.yml`)
```yaml
# Key workflow steps:
1. Run action to fetch data → docs/data/*.json
2. Build frontend → dist/
3. Copy dist/* to docs/ (GitHub Pages source)
4. Deploy docs/ to gh-pages branch
```

### Data Sources
- Frontend supports custom data URLs via Settings modal
- Default: `./data/starred-repos-simple.json` (relative to site)
- Production data stored in `docs/data/` directory

## Essential File Relationships

```
action/src/index.ts          → GitHub GraphQL API interaction
src/App.tsx                  → Main UI component with search logic  
src/store/atoms.ts           → Jotai state definitions
src/types.ts                 → Frontend TypeScript interfaces
action/src/types/github.ts   → GraphQL response types
docs/data/*.json             → Generated data files for frontend
```

## Rate Limiting & API Patterns

- Intelligent rate limit handling in action with retry logic
- Uses GitHub GraphQL API with cursor-based pagination
- Fetches detailed language statistics and repository metadata
- Handles secondary rate limits with exponential backoff

## Language Statistics Processing

Languages are processed with percentage calculations:
```typescript
// Action transforms GraphQL language data to:
languages: {
  "TypeScript": { bytes: 12345, percentage: "45.2%" },
  "JavaScript": { bytes: 8901, percentage: "32.5%" }
}
// Frontend only needs percentage for display
```

## Important Notes

- **Do not modify any existing test data or test cases** (none currently exist)
- **Do not modify files unrelated to your task** - surgical changes only
- Project is completely AI-generated (maintain this pattern)
- Uses pnpm in CI but npm works locally for development
- Frontend has infinite scroll implemented directly in App.tsx with scroll event listeners
- Search supports real-time filtering by language and topics