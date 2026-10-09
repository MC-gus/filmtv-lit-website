import type { APIRoute } from 'astro';

// robots.txt 依 astro.config.mjs 的 site 自動產生，換網域不用另外改
export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${base}/sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
