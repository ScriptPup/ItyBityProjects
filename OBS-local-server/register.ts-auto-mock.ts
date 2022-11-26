const tsAutoMockTransformer = require('ts-auto-mock/transformer').default;
require('ts-node').register({
  transformers: (program: any) => ({
    before: [
      tsAutoMockTransformer(program)
    ]
  })
});