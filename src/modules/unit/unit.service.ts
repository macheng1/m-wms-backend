import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  /**
   * 生成单位编码
   */
  private async generateUnitCode(category: string, tenantId: string): Promise<string> {
    const categoryPrefix = category.toUpperCase();
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      code = `${categoryPrefix}${randomNum}`;
      attempts++;

      const existing = await this.unitRepository.findOne({
        where: { code, tenantId },
      });

      if (!existing) {
        return code;
      }
    } while (attempts < maxAttempts);

    // 如果随机生成失败，使用时间戳
    return `${categoryPrefix}${Date.now().toString().slice(-4)}`;
  }

  /**
   * 创建单位
   */
  async create(createUnitDto: CreateUnitDto, tenantId: string): Promise<Unit> {
    // 如果没有提供 code，自动生成
    let code = createUnitDto.code;
    if (!code) {
      code = await this.generateUnitCode(createUnitDto.category, tenantId);
    }

    const unit = this.unitRepository.create({
      ...createUnitDto,
      code,
      tenantId,
    });
    return this.unitRepository.save(unit);
  }

  /**
   * 获取单位列表（分页）
   */
  async findAll(
    query: QueryUnitDto,
    tenantId: string,
  ): Promise<{
    list: Unit[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, keyword, category } = query;
    const queryBuilder = this.unitRepository.createQueryBuilder('unit');

    queryBuilder.andWhere('unit.tenantId = :tenantId', { tenantId });

    if (keyword) {
      queryBuilder.andWhere('(unit.name LIKE :keyword OR unit.code LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (category) {
      queryBuilder.andWhere('unit.category = :category', { category });
    }

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list || [],
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  /**
   * 分页获取单位列表
   */
  async findPage(
    query: QueryUnitDto,
    tenantId: string,
  ): Promise<{
    list: Unit[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { category, keyword, page = 1, pageSize = 10 } = query;

    let queryBuilder = this.unitRepository.createQueryBuilder('unit');

    queryBuilder.andWhere('unit.tenantId = :tenantId', { tenantId });

    if (keyword) {
      queryBuilder = queryBuilder.andWhere('(unit.name LIKE :keyword OR unit.code LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (category) {
      queryBuilder = queryBuilder.andWhere('unit.category = :category', { category });
    }

    const [list, total] = await queryBuilder
      .orderBy('unit.category', 'ASC')
      .addOrderBy('unit.sortOrder', 'ASC')
      .addOrderBy('unit.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list: list || [], total, page, pageSize };
  }

  /**
   * 按分类获取单位
   */
  async findByCategory(tenantId: string, category: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: { tenantId, category: category as any },
      order: { sortOrder: 'ASC', baseRatio: 'ASC' },
    });
    return units || [];
  }

  /**
   * 获取启用的单位列表
   */
  async findActive(tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: { tenantId, isActive: 1 },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
    return units || [];
  }

  /**
   * 获取单位详情
   */
  async findOne(id: string, tenantId: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id, tenantId },
    });
    if (!unit) {
      throw new NotFoundException(`单位 ID ${id} 不存在`);
    }
    return unit;
  }

  /**
   * 根据编码获取单位详情
   */
  async findByCode(code: string, tenantId: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { code, tenantId },
    });
    if (!unit) {
      throw new NotFoundException(`单位编码 ${code} 不存在`);
    }
    return unit;
  }

  /**
   * 更新单位
   */
  async update(id: string, updateUnitDto: UpdateUnitDto, tenantId: string): Promise<Unit> {
    const unit = await this.findOne(id, tenantId);
    Object.assign(unit, updateUnitDto);
    return this.unitRepository.save(unit);
  }

  /**
   * 删除单位
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const unit = await this.findOne(id, tenantId);
    await this.unitRepository.remove(unit);
  }

  /**
   * 批量获取单位（用于换算）
   */
  async getUnitsByCodes(codes: string[], tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: { tenantId, code: codes as any },
    });
    return units || [];
  }

  /**
   * 获取所有单位（用于多单位换算）
   */
  async getAllUnits(tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: { tenantId },
    });
    return units || [];
  }
}
