import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wordsus.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/search-index/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
