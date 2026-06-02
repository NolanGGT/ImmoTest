import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://immotest.fr', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://immotest.fr/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://immotest.fr/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
