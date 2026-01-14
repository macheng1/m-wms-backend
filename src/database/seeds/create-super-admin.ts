import bcrypt from 'bcryptjs/umd/types';

// src/database/seeds/create-super-admin.ts
export async function createPlatformAdmin() {
  const hashedPassword = await bcrypt.hash('YourStrongPassword', 10);
  const admin = this.userRepo.create({
    username: 'superadmin',
    password: hashedPassword,
    tenantId: null, // 平台级
    isPlatformAdmin: true,
    nickname: '平台总负责人',
  });
  await this.userRepo.save(admin);
}
