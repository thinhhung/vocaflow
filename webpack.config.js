const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "development",
  entry: [
    "./src/styles.css", 
    "./src/renderer.js"
  ],
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, '/'),
    },
    hot: true,
    port: 9000,
    devMiddleware: {
      publicPath: '/dist/',
    }
  },
  devtool: "eval-source-map",
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 1000
  }
};
