import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products/', '/terms', '/privacy'],
        disallow: ['/admin', '/api/', '/studio', '/metrics', '/checkout'],
      },
    ],
    sitemap: 'https://btboutiqe.com/sitemap.xml',
    host: 'https://btboutiqe.com',
  };
}
