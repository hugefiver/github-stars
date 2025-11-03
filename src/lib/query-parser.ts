/**
 * 高级搜索查询解析器
 * 解析搜索字符串并返回结构化对象
 */

interface ParsedQuery {
  query: string; // 主搜索词，例如 'xyz'
  fields: { [key: string]: string | string[] | ParsedQuery[] }; // 例如 { tag: ['abc', 'def'] } 或 { tag: [ParsedQuery, ParsedQuery] } 用于嵌套
  booleanOps: { [key: string]: 'AND' | 'OR' | 'NOT' }; // 处理字段之间的布尔逻辑
  sortBy: string | null; // 例如 'repo_name'
  sortOrder: 'asc' | 'desc' | null; // 例如 'asc'
}

/**
 * 解析搜索查询字符串
 * @param queryString - 搜索字符串，例如 'xyz (tag:abc OR tag:def) order_by:repo_name order:asc'
 * @returns 结构化的查询对象
 */
export function parseQuery(queryString: string): ParsedQuery {
  // 初始化返回对象
  const result: ParsedQuery = {
    query: '',
    fields: {},
    booleanOps: {},
    sortBy: null,
    sortOrder: null
  };

  if (!queryString || queryString.trim() === '') {
    return result;
 }
 
 /**
  * 解析嵌套的布尔表达式
  * @param expression 布尔表达式字符串，例如 "(value1 OR value2) AND (value3 OR value4)"
  * @returns 解析后的查询对象数组
  */
 function parseNestedBooleanExpression(expression: string): ParsedQuery[] {
   // 简化处理：按顶级 OR/AND 分割表达式
   // 这是一个基本实现，可以根据需要进一步优化
   const expressions: string[] = [];
   let currentExpression = '';
   let parenCount = 0;
   let inQuotes = false;
   let quoteChar = '';
 
   for (let i = 0; i < expression.length; i++) {
     const char = expression[i];
     
     if (char === '"' || char === "'") {
       if (!inQuotes) {
         inQuotes = true;
         quoteChar = char;
       } else if (char === quoteChar) {
         inQuotes = false;
       }
     }
     
     if (!inQuotes) {
       if (char === '(') {
         parenCount++;
       } else if (char === ')') {
         parenCount--;
       }
     }
     
     if (!inQuotes && parenCount === 0 && expression.substring(i).startsWith(' OR ')) {
       if (currentExpression.trim()) {
         expressions.push(currentExpression.trim());
       }
       currentExpression = '';
       i += 2; // 跳过 'OR'
       continue;
     }
     
     if (!inQuotes && parenCount === 0 && expression.substring(i).startsWith(' AND ')) {
       if (currentExpression.trim()) {
         expressions.push(currentExpression.trim());
       }
       currentExpression = '';
       i += 3; // 跳过 'AND'
       continue;
     }
     
     currentExpression += char;
   }
   
   if (currentExpression.trim()) {
     expressions.push(currentExpression.trim());
   }
   
   // 为每个表达式创建一个查询对象
   return expressions.map(expr => parseQuery(expr));
 }

  // 复制查询字符串以进行处理
  let query = queryString.trim();

  // 解析排序字段 (order_by:field)
  const orderByRegex = /order_by:(\w+)/gi;
  const orderByMatches = [...query.matchAll(orderByRegex)];
  if (orderByMatches.length > 0) {
    // 取最后一个匹配项（如果有多个）
    const lastMatch = orderByMatches[orderByMatches.length - 1];
    result.sortBy = lastMatch[1];
    // 从查询中移除排序部分
    query = query.replace(orderByRegex, '').trim();
  }

  // 解析排序顺序 (order:asc/desc)
  const orderRegex = /order:(asc|desc)/gi;
  const orderMatches = [...query.matchAll(orderRegex)];
  if (orderMatches.length > 0) {
    // 取最后一个匹配项（如果有多个）
    const lastMatch = orderMatches[orderMatches.length - 1];
    result.sortOrder = lastMatch[1] as 'asc' | 'desc';
    // 从查询中移除排序部分
    query = query.replace(orderRegex, '').trim();
  }

  // 解析字段搜索 (field:value 或 field:(value1 OR value2) 或 field:((value1 OR value2) AND (value3 OR value4)))
  const fieldRegex = /(\w+):(\((?:[^()]|\([^()]*\))*\)|"[^"]*"|'[^']*'|[^"'\s]+)/g;
  const fieldMatches = [...query.matchAll(fieldRegex)];
  
  // 临时存储字段匹配结果，避免在迭代过程中修改字符串
  const fieldMatchesCopy = [...fieldMatches];

  for (const match of fieldMatches) {
    const field = match[1];
    let value = match[2]; // 修正：现在 match[2] 是完整的值（包括括号或引号）

    // 检查值是否是复杂的嵌套表达式
    if (value.startsWith('(') && value.endsWith(')')) {
      // 这是一个括号表达式，需要进一步解析
      const innerExpression = value.substring(1, value.length - 1).trim();
      // 解析嵌套的布尔表达式
      const nestedQueries = parseNestedBooleanExpression(innerExpression);
      (result.fields as any)[field] = nestedQueries;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      // 处理双引号中的值
      (result.fields as any)[field] = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      // 处理单引号中的值
      (result.fields as any)[field] = value.substring(1, value.length - 1);
    } else if (value.includes(' OR ') || value.includes(' AND ') || value.includes(' NOT ')) {
      // 处理字段内的布尔逻辑，例如 tag:(value1 OR value2)
      const parts = value.split(/\s+(OR|AND|NOT)\s+/);
      const values: string[] = [];
      let currentOp: 'OR' | 'AND' | 'NOT' | null = null;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part === 'OR' || part === 'AND' || part === 'NOT') {
          currentOp = part as 'OR' | 'AND' | 'NOT';
          // 记录字段间的布尔运算符
          if (field in result.booleanOps) {
            // 如果字段已经有布尔运算符，根据需要更新
            if (currentOp === 'OR') {
              result.booleanOps[field] = 'OR';
            }
          } else {
            result.booleanOps[field] = currentOp;
          }
        } else {
          // 这是一个值
          values.push(part);
        }
      }

      // 如果字段已存在，合并值
      if (field in result.fields) {
        const existingValue = result.fields[field];
        if (Array.isArray(existingValue)) {
          (result.fields as any)[field] = [...existingValue, ...values];
        } else {
          (result.fields as any)[field] = [existingValue as string, ...values];
        }
      } else {
        (result.fields as any)[field] = values.length === 1 ? values[0] : values;
      }
    } else {
      // 简单的字段值对
      if (field in result.fields) {
        // 如果字段已存在，转换为数组
        const existingValue = result.fields[field];
        if (Array.isArray(existingValue)) {
          (result.fields as any)[field].push(value);
        } else {
          (result.fields as any)[field] = [existingValue as string, value];
        }
      } else {
        (result.fields as any)[field] = value;
      }
    }
  }

  // 从查询中移除所有字段部分，以获取主查询词
  let mainQuery = query;
  for (const match of fieldMatchesCopy) {
    mainQuery = mainQuery.replace(match[0], '').trim();
  }

  // 清理多余的空格和括号
  result.query = mainQuery
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '') // 移除空括号
    .trim();

// 使用示例
/*
const example1 = parseQuery('xyz');
// 返回: { query: 'xyz', fields: {}, booleanOps: {}, sortBy: null, sortOrder: null }

const example2 = parseQuery('xyz tag:abc');
// 返回: { query: 'xyz', fields: { tag: 'abc' }, booleanOps: {}, sortBy: null, sortOrder: null }

const example3 = parseQuery('xyz (tag:abc OR tag:def)');
// 返回: { query: 'xyz', fields: { tag: ['abc', 'def'] }, booleanOps: { tag: 'OR' }, sortBy: null, sortOrder: null }

const example4 = parseQuery('xyz order_by:repo_name order:asc');
// 返回: { query: 'xyz', fields: {}, booleanOps: {}, sortBy: 'repo_name', sortOrder: 'asc' }

const example5 = parseQuery('xyz (tag:abc OR tag:def) order_by:repo_name order:asc');
// 返回: { query: 'xyz', fields: { tag: ['abc', 'def'] }, booleanOps: { tag: 'OR' }, sortBy: 'repo_name', sortOrder: 'asc' }
*/
  // 如果主查询为空，但有字段搜索，则可能需要特殊处理
  // 但根据需求，我们保留当前的实现

  return result;
}