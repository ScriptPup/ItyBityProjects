/** @format */

import * as tsAutoMockTransformer from "ts-auto-mock/transformer";

require("ts-node").register({
  transformers: (program: any) => ({
    before: [tsAutoMockTransformer.default(program)],
  }),
});
