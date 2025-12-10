// @ts-nocheck

type UserRank = 'registrado' | 'invitado' | 'miembro' | 'vip' | 'premium' | 'elite'
/**
 * Seed script for YigiCoin database (minimal, compatible with current schema)
 * Creates base users per rank and a few special cases for testing.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Para pruebas, esto NO es un hash real. Si luego quieres login real, tendrás que guardar un hash de verdad.
const DEFAULT_SEED_PASSWORD_HASH = 'test123'

const HOURS: Record<UserRank, number> = {
  registrado: 168,
  invitado: 72,
  miembro: 72,
  vip: 84,
  premium: 96,
  elite: 120,
}

const TOTEM_FLOOR: Record<UserRank, number> = {
  registrado: 0,
  invitado: 0,
  miembro: 0,
  vip: 1,
  premium: 2,
  elite: 4,
}

function counterMsForRankSeed(rank: UserRank): number {
  return (HOURS[rank] ?? 72) * 3600_000
}

async function createUserSafe(opts: {
  email: string
  name: string
  rank: UserRank
  points?: number
  totems?: number
  counterExpiresAt?: Date | null
  isSuspended?: boolean
  passwordHash?: string
}) {
  const { email, name, rank } = opts
  const points = opts.points ?? 0
  const totems = opts.totems ?? TOTEM_FLOOR[rank]
  const counterExpiresAt = opts.counterExpiresAt ?? new Date(Date.now() + counterMsForRankSeed(rank))
  const isSuspended = opts.isSuspended ?? false
  const passwordHash = opts.passwordHash ?? DEFAULT_SEED_PASSWORD_HASH

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      rank,
      points,
      totems,
      counterExpiresAt,
      isSuspended,
      passwordHash,
    },
    create: {
      email,
      name,
      rank,
      points,
      totems,
      counterExpiresAt,
      isSuspended,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      rank: true,
      points: true,
      totems: true,
      counterExpiresAt: true,
      isSuspended: true,
    },
  })
}

async function main() {
  console.log('🌱 Starting YigiCoin seed (minimal)…')

  // Un usuario por rango
  const baseUsers = await Promise.all([
    createUserSafe({ email: 'registrado@yigicoin.test', name: 'Registrado', rank: 'registrado' }),
    createUserSafe({ email: 'invitado@yigicoin.test', name: 'Invitado', rank: 'invitado' }),
    createUserSafe({ email: 'miembro@yigicoin.test', name: 'Miembro', rank: 'miembro' }),
    createUserSafe({ email: 'vip@yigicoin.test', name: 'VIP', rank: 'vip' }),
    createUserSafe({ email: 'premium@yigicoin.test', name: 'Premium', rank: 'premium' }),
    createUserSafe({ email: 'elite@yigicoin.test', name: 'Elite', rank: 'elite' }),
  ])
  console.log('✅ Base users:', baseUsers.map(u => `${u.email} (${u.rank})`).join(', '))

  // Especial: expirado con tótem (para probar uso automático)
  await createUserSafe({
    email: 'expired_with_totem@yigicoin.test',
    name: 'Expired With Totem',
    rank: 'vip',
    totems: 1,
    counterExpiresAt: new Date(Date.now() - 60_000),
  })
  console.log('✅ User expired_with_totem (vip, totems=1, expired)')

  // Especial: expirado sin tótem (para probar suspensión)
  await createUserSafe({
    email: 'expired_no_totem@yigicoin.test',
    name: 'Expired No Totem',
    rank: 'miembro',
    totems: 0,
    counterExpiresAt: new Date(Date.now() - 60_000),
  })
  console.log('✅ User expired_no_totem (miembro, totems=0, expired)')

  // Usuarios ricos y pobres para probar la tienda
  await createUserSafe({
    email: 'rich@yigicoin.test',
    name: 'Rich User',
    rank: 'invitado',
    points: 10_000,
  })
  await createUserSafe({
    email: 'poor@yigicoin.test',
    name: 'Poor User',
    rank: 'invitado',
    points: 10,
  })
  console.log('✅ Users for store testing: rich (10000 pts), poor (10 pts)')

  console.log('🌱 Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
