import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/analyser', '/biens', '/carte', '/admin', '/api/'],
    },
    sitemap: 'https://immotest.fr/sitemap.xml',
  }
}
