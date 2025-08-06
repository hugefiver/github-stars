# GitHub Copilot Frontend Development Prompts

## React Component Development

### Creating New Components

When creating new React components for this project:

- Use functional components with TypeScript
- Follow the existing component structure in `src/App.tsx`
- Import React at the top: `import React, { useState, useEffect, useMemo } from 'react';`
- Use proper TypeScript interfaces for props
- Implement responsive design with SCSS classes
- Follow the existing styling patterns in `src/App.scss`

### Component Structure Example

```typescript
interface ComponentProps {
  data: Repository[];
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const MyComponent: React.FC<ComponentProps> = ({ data, onFilterChange, className = '' }) => {
  const [localState, setLocalState] = useState<string>('');
  
  const processedData = useMemo(() => {
    return data.filter(item => item.name.includes(localState));
  }, [data, localState]);
  
  return (
    <div className={`my-component ${className}`}>
      {/* Component content */}
    </div>
  );
};

export default MyComponent;
```

### State Management Patterns

- Use **Jotai atoms** for persistent state (user preferences)
- Use **useState** for transient state (search terms, filters)
- Import atoms from `src/store/atoms`
- Example atom usage:

```typescript
const [sortBy, setSortBy] = useAtom(sortByAtom);
const [searchTerm, setSearchTerm] = useState<string>('');
```

## Search and Filtering Implementation

### MiniSearch Integration

When implementing search functionality:

- Use the existing MiniSearch instance pattern
- Configure search fields properly:

```typescript
const miniSearch = new MiniSearch({
  fields: ['name', 'full_name', 'description', 'language', 'topics'],
  storeFields: ['id', 'name', 'full_name', 'description', 'language', 'languages', 'topics', 'html_url', 'stargazers_count', 'forks_count', 'updated_at', 'created_at', 'starred_at'],
  searchOptions: {
    boost: { name: 2, full_name: 2, topics: 1.5 },
    fuzzy: 0.2,
    prefix: true
  }
});
```

### Filter Implementation

When adding new filters:

1. Add state management (useState for transient, Jotai for persistent)
2. Implement filter logic in `filteredAndSortedRepos` useMemo
3. Add UI controls in the filters section
4. Update the reset logic when data source changes

Example filter pattern:

```typescript
const [selectedLanguage, setSelectedLanguage] = useState<string>('');
const [selectedTag, setSelectedTag] = useState<string>('');

const filteredAndSortedRepos = useMemo(() => {
  let result: Repository[] = repos.filter(repo => {
    const matchesLanguage = !selectedLanguage || repo.language === selectedLanguage;
    const matchesTag = !selectedTag || (repo.topics && repo.topics.includes(selectedTag));
    return matchesLanguage && matchesTag;
  });
  
  // Apply sorting...
  return result;
}, [repos, selectedLanguage, selectedTag]);
```

## Data Display Patterns

### Repository Card Structure

Follow the existing repository card pattern in `App.tsx`:

```typescript
<div key={repo.id} className="repo-card">
  <div className="repo-header">
    <h2 className="repo-name">
      <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
        {repo.full_name}
      </a>
    </h2>
    <span className="repo-language">{repo.language}</span>
  </div>
  
  <p className="repo-description">
    {repo.description || 'No description provided.'}
  </p>
  
  {/* Additional sections */}
</div>
```

### Language Statistics Display

When displaying language statistics:

```typescript
{repo.languages && Object.keys(repo.languages).length > 0 && (
  <div className="repo-languages-compact">
    <h4>Languages</h4>
    <div className="repo-language-bar-container">
      <div className="repo-language-bar-segmented">
        {Object.entries(repo.languages)
          .sort(([,a], [,b]) => parseFloat(b.percentage) - parseFloat(a.percentage))
          .map(([language, data]) => (
            parseFloat(data.percentage) >= 0.5 && (
              <div
                key={`${repo.id}-${language}-segment`}
                className={`repo-language-segment lang-${language.replace(/[^a-zA-Z0-9]/g, '_')}`}
                style={{ width: `${data.percentage}%` }}
                title={`${language}: ${data.percentage}%`}
              ></div>
            )
          ))}
      </div>
    </div>
  </div>
)}
```

## Responsive Design Patterns

### SCSS Structure

Follow the existing SCSS patterns:

```scss
.repo-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  @media (max-width: 768px) {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .repo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .repo-name {
      margin: 0;
      font-size: 18px;
      
      a {
        color: #0366d6;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
```

### Mobile-First Approach

- Design for mobile screens first
- Use media queries for larger screens
- Follow existing breakpoint patterns:
  - `768px` for tablet
  - `1024px` for desktop

## Performance Optimization

### useMemo and useCallback Usage

Use useMemo for expensive computations:

```typescript
const filteredAndSortedRepos = useMemo(() => {
  // Expensive filtering and sorting logic
  return processedData;
}, [repos, searchTerm, selectedLanguage, selectedTag, sortBy, sortOrder]);
```

### Infinite Scroll Implementation

Follow the existing infinite scroll pattern:

```typescript
useEffect(() => {
  const handleScroll = () => {
    if (loadingMore || displayedRepos.length >= filteredAndSortedRepos.length) {
      return;
    }

    const scrollPosition = window.scrollY + window.innerHeight;
    const threshold = document.documentElement.scrollHeight - 200;

    if (scrollPosition >= threshold) {
      setLoadingMore(true);
      setTimeout(() => {
        setDisplayedCount(prev => prev + itemsPerLoad);
        setLoadingMore(false);
      }, 500);
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [loadingMore, displayedRepos.length, filteredAndSortedRepos.length]);
```

## Error Handling and Loading States

### Loading State Pattern

```typescript
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);

if (loading) {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <p>Loading data...</p>
    </div>
  );
}

if (error) {
  return (
    <div className="error">
      <p>Error: {error}</p>
    </div>
  );
}
```

### Data Fetching Error Handling

```typescript
const fetchData = async (url: string) => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    setRepos(data);
  } catch (err) {
    console.error('Error fetching data:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred');
  } finally {
    setLoading(false);
  }
};
```

## Type Safety Patterns

### Repository Interface Usage

Always use the defined TypeScript interfaces:

```typescript
import { Repository, LanguageStats } from './types';

// Use proper typing for props and state
const [repos, setRepos] = useState<Repository[]>([]);
const [languageStats, setLanguageStats] = useState<LanguageStats | null>(null);
```

### Optional Chaining and Null Checking

```typescript
// Safe property access
const repoName = repo?.full_name || 'Unknown Repository';
const language = repo?.language || 'Unknown';
const topics = repo?.topics || [];

// Conditional rendering
{repo.topics && repo.topics.length > 0 && (
  <div className="repo-topics">
    {repo.topics.map(topic => (
      <span key={topic} className="repo-topic">{topic}</span>
    ))}
  </div>
)}
```

## Common Development Tasks

### Adding New Sort Options

1. Add new option to the sortBy select
2. Update the sorting logic in `filteredAndSortedRepos`
3. Add proper TypeScript typing

### Adding New Filter Types

1. Create state for the new filter
2. Add UI component for the filter
3. Implement filter logic in the useMemo
4. Add reset logic in the useEffect

### Modifying Data Structure

1. Update the TypeScript interface in `src/types.ts`
2. Update the GraphQL query in `action/src/index.ts`
3. Update the data processing logic
4. Update the frontend display logic

## Testing Guidelines

### Manual Testing Checklist

- Test search functionality with various terms
- Verify all filter combinations work
- Test responsive design on different screen sizes
- Test error states and loading indicators
- Verify infinite scroll behavior
- Test settings modal functionality

### Performance Testing

- Test with large datasets (1000+ repositories)
- Verify search performance
- Check memory usage during filtering
- Test scrolling performance

## Accessibility Considerations

### Semantic HTML

- Use proper heading hierarchy
- Use semantic elements for structure
- Provide proper alt text for images
- Ensure keyboard navigation works

### Screen Reader Support

- Use ARIA labels where appropriate
- Provide proper focus management
- Ensure color contrast meets WCAG standards
- Test with screen readers when possible
