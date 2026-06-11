import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto';
import { BusinessException } from '@/common/filters/business.exception';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    private readonly dataSource: DataSource,
  ) {}

  private scopeWhere(tenantId: string | null) {
    return tenantId === null ? { tenantId: IsNull() } : { tenantId };
  }

  private readableScopeWhere(tenantId: string | null) {
    return tenantId === null ? [{ tenantId: IsNull() }] : [{ tenantId }, { tenantId: IsNull() }];
  }

  /**
   * 生成单位编码
   */
  private async generateUnitCode(category: string, tenantId: string | null): Promise<string> {
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
        where: this.readableScopeWhere(tenantId).map((scope) => ({ code, ...scope })),
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
  async create(createUnitDto: CreateUnitDto, tenantId: string | null): Promise<Unit> {
    // 如果没有提供 code，自动生成
    let code = createUnitDto.code;
    if (!code) {
      code = await this.generateUnitCode(createUnitDto.category, tenantId);
    }
    const exists = await this.unitRepository.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ code, ...scope })),
    });
    if (exists) throw new BusinessException(`单位编码 ${code} 已存在`);

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
    tenantId: string | null,
  ): Promise<{
    list: Unit[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, keyword, category, templateScope } = query;
    const queryBuilder = this.unitRepository.createQueryBuilder('unit');

    this.applyTenantScope(queryBuilder, tenantId);
    if (templateScope === 'standard') queryBuilder.andWhere('unit.tenantId IS NULL');
    if (templateScope === 'custom')
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
    tenantId: string | null,
  ): Promise<{
    list: Unit[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { category, keyword, page = 1, pageSize = 10, templateScope } = query;

    let queryBuilder = this.unitRepository.createQueryBuilder('unit');

    this.applyTenantScope(queryBuilder, tenantId);
    if (templateScope === 'standard') queryBuilder = queryBuilder.andWhere('unit.tenantId IS NULL');
    if (templateScope === 'custom') {
      queryBuilder = queryBuilder.andWhere('unit.tenantId = :tenantId', { tenantId });
    }

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
  async findByCategory(tenantId: string | null, category: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: this.readableScopeWhere(tenantId).map((scope) => ({
        ...scope,
        category: category as any,
      })),
      order: { sortOrder: 'ASC', baseRatio: 'ASC' },
    });
    return units || [];
  }

  /**
   * 获取启用的单位列表
   */
  async findActive(tenantId: string | null, category?: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: this.readableScopeWhere(tenantId).map((scope) => ({
        ...scope,
        isActive: 1,
        ...(category ? { category: category as any } : {}),
      })),
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
    return units || [];
  }

  /**
   * 获取单位详情
   */
  async findOne(id: string, tenantId: string | null): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ id, ...scope })),
    });
    if (!unit) {
      throw new NotFoundException(`单位 ID ${id} 不存在`);
    }
    return unit;
  }

  /**
   * 根据编码获取单位详情
   */
  async findByCode(code: string, tenantId: string | null): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ code, ...scope })),
    });
    if (!unit) {
      throw new NotFoundException(`单位编码 ${code} 不存在`);
    }
    return unit;
  }

  /**
   * 更新单位
   */
  async update(id: string, updateUnitDto: UpdateUnitDto, tenantId: string | null): Promise<Unit> {
    const unit = await this.findOwnedOne(id, tenantId);
    if (updateUnitDto.code) {
      const exists = await this.unitRepository.findOne({
        where: this.readableScopeWhere(tenantId).map((scope) => ({
          code: updateUnitDto.code,
          ...scope,
          id: Not(id),
        })),
      });
      if (exists) throw new BusinessException(`单位编码 ${updateUnitDto.code} 已存在`);
    }
    Object.assign(unit, updateUnitDto);
    return this.unitRepository.save(unit);
  }

  /**
   * 删除单位
   */
  async remove(id: string, tenantId: string | null): Promise<void> {
    const unit = await this.findOwnedOne(id, tenantId);
    if (tenantId) {
      const [[inventoryRow], [transactionRow]] = await Promise.all([
        this.dataSource.query(
          'SELECT COUNT(*) AS total FROM inventory WHERE unitId = ? AND tenantId = ?',
          [id, tenantId],
        ),
        this.dataSource.query(
          'SELECT COUNT(*) AS total FROM inventory_transactions WHERE unitId = ? AND tenantId = ?',
          [id, tenantId],
        ),
      ]);
      if (Number(inventoryRow?.total || 0) > 0 || Number(transactionRow?.total || 0) > 0) {
        throw new BusinessException('该单位已被库存业务使用，无法删除');
      }
    }
    await this.unitRepository.softRemove(unit);
  }

  /**
   * 批量获取单位（用于换算）
   */
  async getUnitsByCodes(codes: string[], tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ ...scope, code: In(codes) })),
    });
    return units || [];
  }

  private applyTenantScope(
    queryBuilder: ReturnType<Repository<Unit>['createQueryBuilder']>,
    tenantId: string | null,
  ) {
    if (tenantId === null) {
      queryBuilder.andWhere('unit.tenantId IS NULL');
    } else {
      queryBuilder.andWhere('(unit.tenantId = :tenantId OR unit.tenantId IS NULL)', { tenantId });
    }
  }

  private async findOwnedOne(id: string, tenantId: string | null): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id, ...this.scopeWhere(tenantId) },
    });
    if (!unit) {
      throw new NotFoundException(`单位 ID ${id} 不存在或无权操作`);
    }
    return unit;
  }

  /**
   * 获取所有单位（用于多单位换算）
   */
  async getAllUnits(tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: this.readableScopeWhere(tenantId),
    });
    return units || [];
  }
}
