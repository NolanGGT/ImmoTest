import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Test1234!', 12)

  const user = await prisma.user.upsert({
    where: { email: 'test@immosafe.fr' },
    update: {},
    create: {
      email: 'test@immosafe.fr',
      passwordHash,
    },
  })

  console.log('Seeded user:', user.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
