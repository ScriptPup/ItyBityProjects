/** @format */

path = require("path");

module.exports = {
  mode: "production",
  entry: {
    chat_relay: "./content/js/src/chat_relay.ts",
    setup: "./content/js/src/setup.ts",
    showcase: "./content/js/src/showcase.ts",
    showcase_setup: "./content/js/src/showcase_setup.ts",
    index: "./content/js/src/index.ts",
  },
  performance: {
    maxAssetSize: 1000000,
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(__dirname, "content/tsconfig.json"),
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "content/js/dist"),
  },
};
