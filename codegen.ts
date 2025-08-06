import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'document/schema.docs.graphql',
  generates: {
    'action/src/types/graphql.ts': {
      plugins: ['typescript'],
    },
  },
};

export default config;
