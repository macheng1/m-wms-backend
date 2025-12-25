import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.tenantRepository.create(createTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find();
  }

  async findOne(id: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Tenant> {
    return this.tenantRepository.findOne({ where: { code } });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    await this.tenantRepository.update(id, updateTenantDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.tenantRepository.delete(id);
  }
}
