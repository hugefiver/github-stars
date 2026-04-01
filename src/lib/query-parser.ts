export interface ParsedQuery {
  query: string;
  fields: Record<string, string | string[]>;
  negatedFields: Record<string, string | string[]>;
  booleanOps: Record<string, 'AND' | 'OR'>;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc' | null;
}

/**
 * Parse a search query string into a structured object.
 *
 * Supported syntax:
 *   - Simple text: `hello world`
 *   - Field filters: `tag:react lang:typescript`
 *   - Quoted values: `tag:"react component"` or `tag:'react component'`
 *   - Multiple values: `tag:react tag:vue` (implicit AND)
 *   - Boolean groups: `(tag:react OR tag:vue)`
 *   - Sort: `order_by:stars order:desc`
 */
export function parseQuery(queryString: string): ParsedQuery {
  const result: ParsedQuery = {
    query: '',
    fields: {},
    negatedFields: {},
    booleanOps: {},
    sortBy: null,
    sortOrder: null,
  };

  if (!queryString || queryString.trim() === '') {
    return result;
  }

  let query = queryString.trim();

  query = extractSort(query, result);
  query = extractBooleanGroups(query, result);
  query = extractFields(query, result);
  result.query = query.replace(/\s+/g, ' ').trim();

  return result;
}

function extractSort(query: string, result: ParsedQuery): string {
  const orderByRegex = /order_by:(\w+)/gi;
  const orderByMatches = [...query.matchAll(orderByRegex)];
  if (orderByMatches.length > 0) {
    result.sortBy = orderByMatches[orderByMatches.length - 1][1];
    query = query.replace(orderByRegex, '').trim();
  }

  const orderRegex = /order:(asc|desc)/gi;
  const orderMatches = [...query.matchAll(orderRegex)];
  if (orderMatches.length > 0) {
    result.sortOrder = orderMatches[orderMatches.length - 1][1] as 'asc' | 'desc';
    query = query.replace(orderRegex, '').trim();
  }

  return query;
}

function extractBooleanGroups(query: string, result: ParsedQuery): string {
  const groups: { start: number; end: number; content: string }[] = [];
  let depth = 0;
  let groupStart = -1;

  for (let i = 0; i < query.length; i++) {
    if (query[i] === '(') {
      if (depth === 0) groupStart = i;
      depth++;
    } else if (query[i] === ')') {
      depth--;
      if (depth === 0 && groupStart >= 0) {
        const before = query.substring(0, groupStart);
        // Skip field-level parens like tag:(...) — only extract standalone groups
        if (!/\w:$/.test(before)) {
          groups.push({
            start: groupStart,
            end: i,
            content: query.substring(groupStart + 1, i),
          });
        }
        groupStart = -1;
      }
    }
  }

  // Reverse order to preserve string indices during removal
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    parseBooleanGroup(group.content, result);
    query = query.substring(0, group.start) + query.substring(group.end + 1);
  }

  return query;
}

/**
 * Parse the inside of a boolean group, e.g. `tag:react OR tag:vue`.
 * For NOT: values before NOT go to fields (positive), values after NOT go to negatedFields.
 */
function parseBooleanGroup(content: string, result: ParsedQuery): void {
  const parts = content.split(/\s+(OR|AND|NOT)\s+/);

  let operator: 'OR' | 'AND' | 'NOT' | null = null;
  let seenNot = false;

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === 'OR' || trimmed === 'AND' || trimmed === 'NOT') {
      if (trimmed === 'NOT') {
        seenNot = true;
      }
      operator = trimmed;
      continue;
    }

    const fieldMatch = trimmed.match(/^(\w+):("([^"]*)"|'([^']*)'|(\S+))$/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      const value = fieldMatch[3] ?? fieldMatch[4] ?? fieldMatch[5];

      if (seenNot) {
        // Values after NOT go to negatedFields
        addFieldValue(result, field, value, true);
      } else {
        // Values before NOT (or in OR/AND groups) go to fields
        addFieldValue(result, field, value, false);
      }

      // Record the boolean op for the positive side (AND/OR only)
      if (operator && operator !== 'NOT' && !(field in result.booleanOps)) {
        result.booleanOps[field] = operator;
      }
    }
  }
}

function extractFields(query: string, result: ParsedQuery): string {
  const fieldRegex = /(\w+):("([^"]*)"|'([^']*)'|\((?:[^()]|\([^()]*\))*\)|(\S+))/g;
  const matches = [...query.matchAll(fieldRegex)];

  for (const match of matches) {
    const field = match[1];
    const value = match[3] ?? match[4] ?? match[5] ?? match[2];

    if (value.startsWith('(') && value.endsWith(')')) {
      const inner = value.substring(1, value.length - 1).trim();
      const valueParts = inner.split(/\s+(OR|AND|NOT)\s+/);
      let seenNot = false;
      for (const vp of valueParts) {
        const t = vp.trim();
        if (t === 'OR' || t === 'AND') {
          if (!(field in result.booleanOps)) {
            result.booleanOps[field] = t;
          }
        } else if (t === 'NOT') {
          seenNot = true;
        } else if (t) {
          addFieldValue(result, field, t, seenNot);
        }
      }
    } else {
      addFieldValue(result, field, value);
    }
  }

  let remaining = query;
  for (const match of matches) {
    remaining = remaining.replace(match[0], '');
  }

  return remaining;
}

function addFieldValue(result: ParsedQuery, field: string, value: string, negated = false): void {
  const target = negated ? result.negatedFields : result.fields;
  if (field in target) {
    const existing = target[field];
    if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      target[field] = [existing, value];
    }
  } else {
    target[field] = value;
  }
}
