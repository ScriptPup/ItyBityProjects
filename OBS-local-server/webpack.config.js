/** @format */

path = require("path");

module.exports = {
  mode: "production",
  entry: {
    chat_relay: "./content/js/src/chat_relay.ts",
    setup: "./content/js/src/setup.ts",
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
