import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://venture-duan.taotao-today.chatgpt.site',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
