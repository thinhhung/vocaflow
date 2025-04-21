import path from "path";
import webpack from "webpack";
import { fileURLToPath } from "url";
import pathBrowserify from "path-browserify";

// In ES modules, __dirname is not available, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: ["./src/styles.css", "./src/renderer.js"],
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
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
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],
    fallback: {
      fs: false,
      path: "path-browserify",
    },
    modules: [path.resolve(__dirname, "src"), "node_modules"],
    extensionAlias: {
      ".js": [".js", ".jsx", ".ts", ".tsx"],
    },
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  devServer: {
    static: {
      directory: path.join(__dirname, "/"),
    },
    hot: true,
    port: 9000,
    devMiddleware: {
      publicPath: "/dist/",
    },
  },
  devtool: "eval-source-map",
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 1000,
  },
};
