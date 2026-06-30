import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// ساخت اتصال به دیتابیس
// - در محیط توسعه: SQLite محلی (file:./db/custom.db)
// - در محیط production (Netlify/Vercel): Turso (libsql://...) — رایگان و دائمی
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  // اگه Turso (libsql://) بود، از adapter استفاده کن
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    })
    return new PrismaClient({ adapter })
  }

  // در غیر این صورت، SQLite محلی
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
