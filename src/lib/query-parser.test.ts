import { describe, it, expect } from 'vitest';
import { parseQuery } from './query-parser';

describe('parseQuery', () => {
  it('should parse a simple single query', () => {
    expect(parseQuery('hello')).toEqual({
      query: 'hello',
      fields: {},
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse a query with a single field', () => {
    expect(parseQuery('test tag:react')).toEqual({
      query: 'test',
      fields: { tag: 'react' },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse a query with multiple fields', () => {
    expect(parseQuery('test tag:react lang:typescript')).toEqual({
      query: 'test',
      fields: { tag: 'react', lang: 'typescript' },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse a query with OR boolean group', () => {
    expect(parseQuery('test (tag:react OR tag:vue)')).toEqual({
      query: 'test',
      fields: { tag: ['react', 'vue'] },
      negatedFields: {},
      booleanOps: { tag: 'OR' },
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse a query with AND boolean group', () => {
    expect(parseQuery('test (tag:react AND tag:typescript)')).toEqual({
      query: 'test',
      fields: { tag: ['react', 'typescript'] },
      negatedFields: {},
      booleanOps: { tag: 'AND' },
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse a query with NOT boolean group', () => {
    expect(parseQuery('test (tag:react NOT tag:angular)')).toEqual({
      query: 'test',
      fields: { tag: 'react' },
      negatedFields: { tag: 'angular' },
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse sort parameters', () => {
    expect(parseQuery('test order_by:stars order:desc')).toEqual({
      query: 'test',
      fields: {},
      negatedFields: {},
      booleanOps: {},
      sortBy: 'stars',
      sortOrder: 'desc',
    });
  });

  it('should parse a complex query with multiple features', () => {
    expect(
      parseQuery('javascript (tag:react OR tag:vue) lang:typescript order_by:stars order:desc')
    ).toEqual({
      query: 'javascript',
      fields: { tag: ['react', 'vue'], lang: 'typescript' },
      negatedFields: {},
      booleanOps: { tag: 'OR' },
      sortBy: 'stars',
      sortOrder: 'desc',
    });
  });

  it('should handle empty string or whitespace-only query', () => {
    expect(parseQuery('')).toEqual({
      query: '',
      fields: {},
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });

    expect(parseQuery('   ')).toEqual({
      query: '',
      fields: {},
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should handle field with single quotes', () => {
    expect(parseQuery("test tag:'react component'")).toEqual({
      query: 'test',
      fields: { tag: 'react component' },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should handle field with double quotes', () => {
    expect(parseQuery('test tag:"react component"')).toEqual({
      query: 'test',
      fields: { tag: 'react component' },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should handle multiple values for the same field', () => {
    expect(parseQuery('test tag:react tag:vue')).toEqual({
      query: 'test',
      fields: { tag: ['react', 'vue'] },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should handle field-level parenthesized values', () => {
    expect(parseQuery('test tag:(react OR vue)')).toEqual({
      query: 'test',
      fields: { tag: ['react', 'vue'] },
      negatedFields: {},
      booleanOps: { tag: 'OR' },
      sortBy: null,
      sortOrder: null,
    });
  });

  it('should parse query with only fields and no main query', () => {
    expect(parseQuery('tag:react lang:typescript')).toEqual({
      query: '',
      fields: { tag: 'react', lang: 'typescript' },
      negatedFields: {},
      booleanOps: {},
      sortBy: null,
      sortOrder: null,
    });
  });
});
