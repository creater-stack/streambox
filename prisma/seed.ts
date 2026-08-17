import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const CATEGORIES = ['Music','Gaming','Tech','Education','Sports','Film','Vlogs','News','Comedy','DIY'];
async function main() {
  for (const name of CATEGORIES) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }
  const email = process.env.ADMIN_EMAIL || 'admin@streambox.local';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { email, username, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' }
  });
  console.log('Seeded categories + admin:', email);
}
main().finally(() => prisma.$disconnect());
