import { Repository } from './types';

// FlexSearch 导入（将在 worker 中动态加载）
let FlexSearch: any = null;

// 搜索索引实例
let searchIndex: any = null;

// 初始化 FlexSearch
async function initializeFlexSearch() {
  if (!FlexSearch) {
    // 动态导入 FlexSearch
    const flexsearchModule = await import('flexsearch');
    FlexSearch = flexsearchModule.default || flexsearchModule;
  }
  
  // 创建搜索索引配置
  const indexConfig = {
    // 字段配置 - 对应原来的 fields: ['name', 'full_name', 'description', 'language', 'topics']
    document: {
      id: 'id',
      index: [
        {
          field: 'name',
          store: true,
          boost: 2
        },
        {
          field: 'full_name', 
          store: true,
          boost: 2
        },
        {
          field: 'description',
          store: true,
          boost: 1
        },
        {
          field: 'language',
          store: true,
          boost: 1
        },
        {
          field: 'topics',
          store: true,
          boost: 1.5,
          split: /\W+/  // 处理 topics 数组
        }
      ]
    },
    // 启用模糊搜索和前缀搜索
    preset: 'score',
    tokenize: 'forward',
    optimize: true
  };
  
  searchIndex = new FlexSearch.Index(indexConfig);
}

// 构建索引
async function buildIndex(repositories: Repository[]) {
  if (!searchIndex) {
    await initializeFlexSearch();
  }
  
  // 清空现有索引
  searchIndex = null;
  await initializeFlexSearch();
  
  // 批量添加数据到索引
  repositories.forEach((repo: Repository) => {
    const doc = {
      id: repo.id,
      name: repo.name || '',
      full_name: repo.full_name || '',
      description: repo.description || '',
      language: repo.language || '',
      topics: Array.isArray(repo.topics) ? repo.topics.join(' ') : ''
    };
    
    searchIndex.add(doc.id, doc);
  });
}

// 执行搜索
function performSearch(query: string, limit: number = 100) {
  if (!searchIndex) {
    throw new Error('Search index not initialized');
  }
  
  // 执行多字段搜索
  const results = searchIndex.search(query, {
    limit: limit,
    suggest: true
  });
  
  // FlexSearch 返回的是数组格式，需要转换为类似 minisearch 的格式
  // 检查 results 的结构并正确处理
  let processedResults: any[] = [];
  
  if (Array.isArray(results)) {
    // 如果 results 是数组，直接处理
    processedResults = results
      .flatMap((result: any) => {
        // 检查 result 是否有 result 属性
        if (result && Array.isArray(result.result)) {
          return result.result;
        }
        // 如果没有 result 属性，但 result 本身是数组，直接返回
        else if (Array.isArray(result)) {
          return result;
        }
        // 否则返回空数组
        else {
          return [];
        }
      })
      .map((id: number) => {
        const doc = searchIndex.get(id);
        return {
          id: doc.id,
          name: doc.name,
          full_name: doc.full_name,
          description: doc.description,
          language: doc.language,
          topics: doc.topics ? doc.topics.split(' ') : [],
          score: 1 // FlexSearch 使用不同的评分机制，这里简化处理
        };
      });
  }
  
  return processedResults;
}

// Worker 消息处理
self.onmessage = async function(e) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'INITIALIZE':
        await initializeFlexSearch();
        self.postMessage({
          type: 'INITIALIZED',
          payload: { success: true }
        });
        break;
        
      case 'BUILD_INDEX':
        buildIndex(payload.repositories);
        self.postMessage({
          type: 'INDEX_BUILT',
          payload: { success: true, count: payload.repositories.length }
        });
        break;
        
      case 'SEARCH':
        const searchResults = performSearch(payload.query, payload.limit);
        self.postMessage({
          type: 'SEARCH_RESULTS',
          payload: {
            query: payload.query,
            results: searchResults,
            count: searchResults.length
          }
        });
        break;
        
      case 'UPDATE_DATA':
        if (searchIndex) {
          buildIndex(payload.repositories);
        }
        self.postMessage({
          type: 'DATA_UPDATED',
          payload: { success: true }
        });
        break;
        
      default:
        self.postMessage({
          type: 'ERROR',
          payload: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
};

// 导出类型定义（供 TypeScript 使用）
export type WorkerMessage = {
  type: 'INITIALIZE' | 'BUILD_INDEX' | 'SEARCH' | 'UPDATE_DATA';
  payload: any;
};

export type WorkerResponse = {
  type: 'INITIALIZED' | 'INDEX_BUILT' | 'SEARCH_RESULTS' | 'DATA_UPDATED' | 'ERROR';
  payload: any;
};