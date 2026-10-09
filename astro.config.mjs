import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 網站正式網址：之後換成學校網域時只要改這一行
  site: 'https://filmtv-lit.pages.dev',
  integrations: [
    tailwind(),
    sitemap(),
  ],
});
