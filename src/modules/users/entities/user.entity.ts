import { TenantBaseEntity } from '@/database/base.entity';
import { Role } from '@/modules/roles/entities/role.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

@Entity('users')
export class User extends TenantBaseEntity {
  @Column({ unique: true })
  username: string;
  @Column({ select: false })
  password: string;
  @Column({ nullable: true })
  nickname: string;
  @ManyToMany(() => Role)
  @JoinTable({ name: 'user_roles' })
  roles: Role[];
}
