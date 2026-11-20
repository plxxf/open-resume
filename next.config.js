/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the app has no server routes, so it is deployed as plain
  // files (Cloudflare Pages). Everything runs in the visitor's browser.
  output: "export",
  // next/image cannot optimize images in a static export.
  images: { unoptimized: true },
  // pdfjs-dist optionally requires the Node "canvas" package, which breaks the
  // client build. Since pdfjs-dist is only used in the browser, we tell webpack
  // to ignore it. https://github.com/mozilla/pdf.js/issues/16214
  // Builds run with `--webpack` (see package.json) so this config keeps working
  // on Next 16, where Turbopack is the default bundler.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = nextConfig;
