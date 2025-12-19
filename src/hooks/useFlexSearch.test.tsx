import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { useFlexSearch } from './useFlexSearch';
import { Repository } from '../types';

type HookState = ReturnType<typeof useFlexSearch>;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function TestComponent({
  repos,
  onUpdate
}: {
  repos: Repository[];
  onUpdate: (state: HookState) => void;
}) {
  const searchState = useFlexSearch(repos);

  useEffect(() => {
    onUpdate(searchState);
  }, [searchState, onUpdate]);

  return null;
}

describe('useFlexSearch', () => {
  it('returns all matching results when more than 100 repositories match', async () => {
    const now = new Date().toISOString();
    const repos: Repository[] = Array.from({ length: 150 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        name: `repo-${id}`,
        full_name: `owner/repo-${id}`,
        html_url: `https://example.com/${id}`,
        description: 'test repo',
        language: 'TypeScript',
        languages: {},
        stargazers_count: 0,
        forks_count: 0,
        updated_at: now,
        created_at: now,
        starred_at: now,
        owner: {
          login: 'owner',
          avatar_url: '',
          html_url: ''
        },
        topics: ['search'],
        licenseInfo: null,
        fundingLinks: [],
        isArchived: false,
        isFork: false,
        parent: null,
        isMirror: false,
        latestRelease: null,
        milestones: [],
        mirrorUrl: null,
        packages: [],
        pushedAt: null
      };
    });

    let latestState: HookState | null = null;
    const onUpdate = (state: HookState) => {
      latestState = state;
    };

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<TestComponent repos={repos} onUpdate={onUpdate} />);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(latestState?.searchIndex).toBeTruthy();

    await act(async () => {
      await latestState?.performSearch('repo');
    });

    expect(latestState?.searchResults.length).toBe(repos.length);

    await act(async () => {
      root.unmount();
    });
  });
});
