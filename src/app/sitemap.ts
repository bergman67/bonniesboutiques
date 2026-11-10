import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://btboutiqe.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/links`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/shipping`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/returns`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  try {
    const products = await prisma.product.findMany({
      where: { isDraft: false },
      select: { id: true, updatedAt: true, createdAt: true, imageUrl: true },
      orderBy: { createdAt: 'desc' },
    });

    if (products.length > 0) {
      const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${baseUrl}/products/${product.id}`,
        lastModified: product.updatedAt || product.createdAt || new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        images: product.imageUrl ? [product.imageUrl] : undefined,
      }));

      return [...staticRoutes, ...productRoutes];
    }
  } catch {
    // Fallback to productAssetManifest if DB is transiently unreachable
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = require('@/lib/scrollytelling/productAssetManifest.json');
    if (manifest?.products?.length) {
      const fallbackRoutes: MetadataRoute.Sitemap = manifest.products.map(
        (p: { id: string; transparentCloudUrl?: string; transparentLocalUrl?: string; originalUrl?: string }) => {
          const img = p.transparentCloudUrl || p.transparentLocalUrl || p.originalUrl;
          return {
            url: `${baseUrl}/products/${p.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            images: img ? [img] : undefined,
          };
        }
      );
      return [...staticRoutes, ...fallbackRoutes];
    }
  } catch {
    // Ignore fallback error
  }

  return staticRoutes;
}
