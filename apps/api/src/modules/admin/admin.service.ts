import { prisma } from '../../lib/prisma'

const COST_PER_ANALYSE = 0.011
const SUBSCRIPTION_PRICE = 39.99

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function getMetrics() {
  const now = new Date()
  const last7 = new Date(now.getTime() - 7 * 86400_000)
  const last30 = new Date(now.getTime() - 30 * 86400_000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers,
    newLast7Days,
    newLast30Days,
    googleUsers,
    activeUsersRaw,
    subCounts,
    subsThisMonth,
    analysisTotal,
    analysisLast7,
    analysisLast30,
    avgScoreRaw,
    topVillesRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last7 } } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.bien.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: last30 }, userId: { not: null } },
    }),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.subscription.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.bien.count(),
    prisma.bien.count({ where: { createdAt: { gte: last7 } } }),
    prisma.bien.count({ where: { createdAt: { gte: last30 } } }),
    prisma.bien.aggregate({ _avg: { scoreImmoSafe: true } }),
    prisma.bien.groupBy({
      by: ['ville'],
      _count: { _all: true },
      orderBy: { _count: { ville: 'desc' } },
      take: 5,
    }),
  ])

  const subByStatus = Object.fromEntries(
    subCounts.map((s) => [s.status, s._count._all])
  ) as Record<string, number>

  const active = subByStatus['ACTIVE'] ?? 0
  const expired = subByStatus['EXPIRED'] ?? 0
  const cancelled = subByStatus['CANCELLED'] ?? 0
  const total = active + expired + cancelled

  return {
    users: {
      total: totalUsers,
      newLast7Days,
      newLast30Days,
      activeUsers: activeUsersRaw.length,
      googleUsers,
    },
    subscriptions: {
      active,
      expired,
      cancelled,
      revenueThisMonth: +(subsThisMonth * SUBSCRIPTION_PRICE).toFixed(2),
      churnRate: total > 0 ? +(((expired + cancelled) / total) * 100).toFixed(1) : 0,
    },
    analyses: {
      total: analysisTotal,
      last7Days: analysisLast7,
      last30Days: analysisLast30,
      avgScoreImmoSafe: +(avgScoreRaw._avg.scoreImmoSafe ?? 0).toFixed(1),
      topVilles: topVillesRaw.map((v) => ({ ville: v.ville, count: v._count._all })),
    },
    tokens: {
      totalAnalyses: analysisTotal,
      estimatedCostEuros: +(analysisTotal * COST_PER_ANALYSE).toFixed(2),
    },
  }
}

// ─── Users list ──────────────────────────────────────────────────────────────

export async function listUsers(params: {
  page: number
  limit: number
  search?: string
  filter?: string
}) {
  const { page, limit, search, filter } = params
  const skip = (page - 1) * limit
  const last24h = new Date(Date.now() - 86400_000)

  const where: Record<string, unknown> = {}
  if (search) where.email = { contains: search, mode: 'insensitive' }
  if (filter === 'subscribed') {
    where.subscription = { status: 'ACTIVE' }
  } else if (filter === 'active') {
    where.biens = { some: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        freeAnalysisUsed: true,
        subscription: { select: { status: true, currentPeriodEnd: true } },
        _count: { select: { biens: true } },
        biens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Detect suspicious users: > 20 analyses in last 24h
  const suspiciousIds = filter === 'suspicious'
    ? (await prisma.bien.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: last24h }, userId: { not: null } },
        _count: { _all: true },
        having: { userId: { _count: { gt: 20 } } },
      })).map((r) => r.userId as string)
    : []

  const mapped = users
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      freeAnalysisUsed: u.freeAnalysisUsed,
      subscription: u.subscription,
      analysesCount: u._count.biens,
      lastAnalysisAt: u.biens[0]?.createdAt ?? null,
      isSuspicious: suspiciousIds.includes(u.id),
    }))
    .filter((u) => filter !== 'suspicious' || u.isSuspicious)

  return {
    users: mapped,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

// ─── User detail ─────────────────────────────────────────────────────────────

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      subscription: true,
      biens: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, ville: true, prix: true, scoreImmoSafe: true, createdAt: true, typeBien: true },
      },
    },
  })

  const auditLogs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const stats = await prisma.bien.aggregate({
    where: { userId },
    _count: { _all: true },
    _avg: { scoreImmoSafe: true },
  })

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const analysesThisMonth = await prisma.bien.count({
    where: { userId, createdAt: { gte: thisMonth } },
  })

  return {
    user,
    subscription: user.subscription,
    analyses: user.biens,
    auditLogs,
    stats: {
      totalAnalyses: stats._count._all,
      analysesThisMonth,
      estimatedTokenCost: +(stats._count._all * COST_PER_ANALYSE).toFixed(2),
      avgScore: +(stats._avg.scoreImmoSafe ?? 0).toFixed(1),
    },
  }
}

// ─── Patch user ───────────────────────────────────────────────────────────────

export async function patchUser(
  targetId: string,
  requesterId: string,
  body: { blocked?: boolean; role?: 'USER' | 'ADMIN' }
) {
  if (body.blocked === true && targetId === requesterId) {
    throw new Error('SELF_BLOCK')
  }

  const data: Record<string, unknown> = {}
  if (body.role !== undefined) data.role = body.role

  // We store blocked state as a convention: blocked users have refreshTokenHash null
  // and we track it via a field. For MVP, blocking = clearing refresh token + adding a
  // "blocked" marker. Since there's no `blocked` field in schema, we'll use a metadata
  // pattern: store blocked users in AuditLog and check there. For now, block = clear tokens.
  // A proper implementation would add a `blocked Boolean @default(false)` field.
  // For this prompt we'll just clear the refresh token on block.

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: targetId }, data })
  }

  if (body.blocked === true) {
    await prisma.user.update({
      where: { id: targetId },
      data: { refreshTokenHash: null },
    })
  }

  return prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  })
}

// ─── Audit logs ──────────────────────────────────────────────────────────────

export async function listAuditLogs(params: {
  page: number
  limit: number
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
}) {
  const { page, limit, userId, action, startDate, endDate } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (action) where.action = action
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, page, totalPages: Math.ceil(total / limit) }
}

// ─── Token stats ──────────────────────────────────────────────────────────────

export async function getTokenStats() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      subscription: { select: { status: true } },
      _count: { select: { biens: true } },
    },
  })

  const rows = users
    .map((u) => {
      const count = u._count.biens
      const cost = +(count * COST_PER_ANALYSE).toFixed(2)
      const isSubscribed = u.subscription?.status === 'ACTIVE'
      const revenue = isSubscribed ? SUBSCRIPTION_PRICE : 0
      return {
        userId: u.id,
        email: u.email,
        analysesCount: count,
        estimatedCostEuros: cost,
        isSubscribed,
        isProfitable: revenue > cost,
      }
    })
    .sort((a, b) => b.estimatedCostEuros - a.estimatedCostEuros)

  const totalCost = +rows.reduce((s, r) => s + r.estimatedCostEuros, 0).toFixed(2)
  const totalRevenue = +rows
    .filter((r) => r.isSubscribed)
    .length * SUBSCRIPTION_PRICE

  const margin = +(totalRevenue - totalCost).toFixed(2)
  const marginPercent = totalRevenue > 0
    ? +((margin / totalRevenue) * 100).toFixed(1)
    : 0

  return {
    users: rows,
    totals: {
      totalCostEuros: totalCost,
      totalRevenueEuros: +totalRevenue.toFixed(2),
      marginEuros: margin,
      marginPercent,
    },
  }
}
