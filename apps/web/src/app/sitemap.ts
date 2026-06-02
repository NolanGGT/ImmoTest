import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://immotest.fr', lastModified: '2026-06-02', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://immotest.fr/register', lastModified: '2026-06-02', changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://immotest.fr/mentions-legales', lastModified: '2026-06-02', changeFrequency: 'yearly', priority: 0.2 },
    { url: 'https://immotest.fr/cgu', lastModified: '2026-06-02', changeFrequency: 'yearly', priority: 0.2 },
    { url: 'https://immotest.fr/confidentialite', lastModified: '2026-06-02', changeFrequency: 'yearly', priority: 0.2 },
  ]
}
