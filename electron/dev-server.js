const express = require("express");
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const path = require("path");
const config = require("../webpack.config.js");

function startDevServer() {
  const app = express();
  const compiler = webpack(config);

  // Tell express to use webpack-dev-middleware and webpack-hot-middleware
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath,
      stats: {
        colors: true,
        chunks: false,
      },
    })
  );

  app.use(webpackHotMiddleware(compiler));

  // Serve static files from the root directory
  app.use(express.static(path.resolve(__dirname, "..")));

  // Always send index.html for any request
  app.use("*", (req, res, next) => {
    const filename = path.join(compiler.outputPath, "index.html");
    compiler.outputFileSystem.readFile(filename, (err, result) => {
      if (err) {
        return next(err);
      }
      res.set("content-type", "text/html");
      res.send(result);
      res.end();
    });
  });

  // Start server
  const server = app.listen(3000, () => {
    console.log("Dev server listening on port 3000");
  });

  return server;
}

module.exports = startDevServer;
