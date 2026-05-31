import NodeCache from 'node-cache'

// TTL 24h, eviction check every hour
export const dvfCache = new NodeCache({ stdTTL: 86_400, checkperiod: 3_600 })
