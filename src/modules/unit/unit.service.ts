import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { UnitConversion } from './entities/unit-conversion.entity';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto } from './dto';
import { BusinessException } from '@/common/filters/business.exception';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitConversion)
    private unitConversionRepository: Repository<UnitConversion>,
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
    const category = createUnitDto.category || 'COUNT';
    // 如果没有提供 code，自动生成
    let code = createUnitDto.code;
    if (!code) {
      code = await this.generateUnitCode(category, tenantId);
    }
    const exists = await this.unitRepository.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ code, ...scope })),
    });
    if (exists) throw new BusinessException(`单位编码 ${code} 已存在`);

    const unit = this.unitRepository.create({
      ...createUnitDto,
      code,
      category: category as any,
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

    const pageList = list || [];
    const unitCodes = pageList.map((unit) => unit.code);
    const conversions =
      unitCodes.length > 0
        ? await this.unitConversionRepository.find({
            where: {
              ...this.scopeWhere(tenantId),
              toUnitCode: In(unitCodes),
            },
            order: { createdAt: 'ASC' },
          })
        : [];
    const fromUnitCodes = [...new Set(conversions.map((item) => item.fromUnitCode))];
    const fromUnits =
      fromUnitCodes.length > 0
        ? await this.unitRepository.find({
            where: this.readableScopeWhere(tenantId).map((scope) => ({
              ...scope,
              code: In(fromUnitCodes),
            })),
          })
        : [];
    const fromUnitMap = new Map(fromUnits.map((unit) => [unit.code, unit]));
    const conversionMap = new Map<string, any[]>();
    for (const conversion of conversions) {
      const fromUnit = fromUnitMap.get(conversion.fromUnitCode);
      const rule = {
        id: conversion.id,
        fromUnitCode: conversion.fromUnitCode,
        toUnitCode: conversion.toUnitCode,
        ratio: Number(conversion.ratio),
        fromUnitName: fromUnit?.name || conversion.fromUnitCode,
        fromUnitSymbol: fromUnit?.symbol || fromUnit?.name || conversion.fromUnitCode,
      };
      const rules = conversionMap.get(conversion.toUnitCode) || [];
      rules.push(rule);
      conversionMap.set(conversion.toUnitCode, rules);
    }

    return {
      list: pageList.map((unit) => ({
        ...unit,
        conversionRules: conversionMap.get(unit.code) || [],
      })),
      total,
      page,
      pageSize,
    };
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
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
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
   * 获取所有单位
   */
  async getAllUnits(tenantId: string): Promise<Unit[]> {
    const units = await this.unitRepository.find({
      where: this.readableScopeWhere(tenantId),
    });
    return units || [];
  }

  async getConversions(toUnitCode: string, tenantId: string | null) {
    const conversions = await this.unitConversionRepository.find({
      where: {
        toUnitCode,
        ...this.scopeWhere(tenantId),
      },
      order: { createdAt: 'ASC' },
    });

    const fromUnitCodes = conversions.map((item) => item.fromUnitCode);
    const fromUnits =
      fromUnitCodes.length > 0
        ? await this.unitRepository.find({
            where: this.readableScopeWhere(tenantId).map((scope) => ({
              ...scope,
              code: In(fromUnitCodes),
            })),
          })
        : [];
    const unitMap = new Map(fromUnits.map((unit) => [unit.code, unit]));

    return conversions.map((item) => ({
      id: item.id,
      fromUnitCode: item.fromUnitCode,
      toUnitCode: item.toUnitCode,
      ratio: Number(item.ratio),
      fromUnit: unitMap.get(item.fromUnitCode) || null,
    }));
  }

  async saveConversions(
    toUnitCode: string,
    items: Array<{ fromUnitCode: string; ratio: number }>,
    tenantId: string | null,
  ) {
    const toUnit = await this.findByCode(toUnitCode, tenantId);
    const normalized = items
      .filter((item) => item.fromUnitCode && item.fromUnitCode !== toUnitCode)
      .map((item) => ({
        fromUnitCode: item.fromUnitCode,
        ratio: Number(item.ratio),
      }));

    const duplicated = new Set<string>();
    for (const item of normalized) {
      if (duplicated.has(item.fromUnitCode)) {
        throw new BusinessException(`来源单位 ${item.fromUnitCode} 重复`);
      }
      duplicated.add(item.fromUnitCode);
      if (!item.ratio || item.ratio <= 0) {
        throw new BusinessException('换算比例必须大于0');
      }

      const fromUnit = await this.findByCode(item.fromUnitCode, tenantId);
      if (fromUnit.code === toUnit.code) {
        throw new BusinessException('来源单位不能等于当前单位');
      }
    }

    await this.unitConversionRepository.delete({
      toUnitCode,
      ...this.scopeWhere(tenantId),
    });

    if (normalized.length === 0) return [];

    const entities = normalized.map((item) =>
      this.unitConversionRepository.create({
        tenantId,
        toUnitCode,
        fromUnitCode: item.fromUnitCode,
        ratio: item.ratio,
      }),
    );
    await this.unitConversionRepository.save(entities);
    return this.getConversions(toUnitCode, tenantId);
  }

  async findConversion(fromUnitCode: string, toUnitCode: string, tenantId: string | null) {
    const conversion = await this.unitConversionRepository.findOne({
      where: {
        fromUnitCode,
        toUnitCode,
        ...this.scopeWhere(tenantId),
      },
    });
    return conversion
      ? {
          ...conversion,
          ratio: Number(conversion.ratio),
        }
      : null;
  }

}
