// @ts-check
import { defineConfig } from 'astro/config';

// Public human-readable mirror of national PKI trust anchors.
// Static output, deployed to GitHub Pages at trust.attestto.org.
export default defineConfig({
  site: 'https://trust.attestto.org',
  base: '/',
  output: 'static',
  trailingSlash: 'ignore',
});
