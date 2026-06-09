import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationType, LocationStatus } from './entities/location.entity';
import { InventoryLocation } from './entities/inventory-location.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import {
  LightTaskAction,
  LightTaskStatus,
  LocationLightTask,
} from './entities/location-light-task.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(InventoryLocation)
    private inventoryLocationRepository: Repository<InventoryLocation>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(LocationLightTask)
    private lightTaskRepository: Repository<LocationLightTask>,
  ) {}

  private async sendLightCommand(options: {
    deviceUrl?: string;
    action: LightTaskAction;
    locationCode: string;
    ledIndex?: number;
    duration: number;
    color: string;
  }): Promise<void> {
    const { deviceUrl, action, locationCode, ledIndex, duration, color } = options;

    if (!deviceUrl) {
      throw new Error('库位未配置灯控设备地址');
    }

    const endpoint = deviceUrl.replace(/\/$/, '');
    const response = await fetch(`${endpoint}/light/${action.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationCode,
        ledIndex,
        duration,
        color,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `灯控设备响应异常: ${response.status}`);
    }
  }

  /**
   * 生成库位编码
   * 格式：仓库-区域-货架-层-位
   * 例如：A01-01-01-03
   */
  private generateLocationCode(dto: CreateLocationDto): string {
    const parts = [
      dto.warehouse,
      dto.area,
      dto.shelf ? String(dto.shelf).padStart(2, '0') : '00',
      dto.level ? String(dto.level).padStart(2, '0') : '00',
      dto.position ? String(dto.position).padStart(2, '0') : '00',
    ];
    return parts.join('-');
  }

  /**
   * 生成库位名称（如果未提供）
   */
  private generateLocationName(dto: CreateLocationDto): string {
    if (dto.name) {
      return dto.name;
    }
    const shelf = dto.shelf || '00';
    const level = dto.level || '00';
    const position = dto.position || '00';
    return `${dto.warehouse}区${dto.area}${shelf}架${level}层${position}位`;
  }

  /**
   * 创建库位
   */
  async create(createLocationDto: CreateLocationDto, tenantId: string): Promise<Location> {
    // 如果没有传入 code，自动生成
    let code = createLocationDto.code;
    if (!code) {
      code = this.generateLocationCode(createLocationDto);
    }

    // 检查库位编码是否已存在
    const existing = await this.locationRepository.findOne({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException(`库位编码 ${code} 已存在`);
    }

    // 生成库位名称（如果未提供）
    const name = this.generateLocationName(createLocationDto);

    const location = this.locationRepository.create({
      ...createLocationDto,
      code,
      name,
      tenantId,
    });

    return this.locationRepository.save(location);
  }

  /**
   * 分页查询库位列表
   */
  async findAll(
    tenantId: string,
    options: QueryLocationDto & {
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    list: Location[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, ...filters } = options;

    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .where('location.tenantId = :tenantId', { tenantId });

    if (filters.code) {
      queryBuilder.andWhere('location.code = :code', { code: filters.code });
    }

    if (filters.warehouse) {
      queryBuilder.andWhere('location.warehouse = :warehouse', {
        warehouse: filters.warehouse,
      });
    }

    if (filters.area) {
      queryBuilder.andWhere('location.area = :area', { area: filters.area });
    }

    if (filters.type) {
      queryBuilder.andWhere('location.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('location.status = :status', {
        status: filters.status,
      });
    }

    if (filters.keyword) {
      queryBuilder.andWhere('(location.code LIKE :keyword OR location.name LIKE :keyword)', {
        keyword: `%${filters.keyword}%`,
      });
    }

    queryBuilder.orderBy('location.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取仓库可视化地图数据。
   * 以 inventory_locations 作为库位库存明细，兼容还未迁移的 inventory.locationId 汇总库存。
   */
  async getVisualMap(
    tenantId: string,
    options: {
      warehouse?: string;
      area?: string;
      keyword?: string;
    } = {},
  ): Promise<{
    warehouses: Array<{ value: string; label: string }>;
    areas: Array<{ value: string; label: string; warehouse: string }>;
    locations: Array<
      Location & {
        stockItems: Array<{
          sku: string;
          productName: string;
          quantity: number;
          lockedQuantity: number;
          availableQuantity: number;
          unitId?: string;
          unitName?: string;
          unitSymbol?: string;
        }>;
        skuCount: number;
        totalQuantity: number;
        hasStock: boolean;
        matched: boolean;
      }
    >;
    summary: {
      totalLocations: number;
      occupiedLocations: number;
      emptyLocations: number;
      disabledLocations: number;
      matchedLocations: number;
    };
  }> {
    const { warehouse, area, keyword } = options;

    const locationQuery = this.locationRepository
      .createQueryBuilder('location')
      .where('location.tenantId = :tenantId', { tenantId });

    if (warehouse) {
      locationQuery.andWhere('location.warehouse = :warehouse', { warehouse });
    }

    if (area) {
      locationQuery.andWhere('location.area = :area', { area });
    }

    locationQuery
      .orderBy('location.warehouse', 'ASC')
      .addOrderBy('location.area', 'ASC')
      .addOrderBy('location.shelf', 'ASC')
      .addOrderBy('location.level', 'ASC')
      .addOrderBy('location.position', 'ASC');

    const locations = await locationQuery.getMany();
    const locationIds = locations.map((location) => location.id);
    const stockByLocation = new Map<string, any[]>();

    const addStockItem = (locationId: string, item: any) => {
      if (!stockByLocation.has(locationId)) {
        stockByLocation.set(locationId, []);
      }
      stockByLocation.get(locationId)!.push(item);
    };

    if (locationIds.length > 0) {
      const detailQuery = this.inventoryLocationRepository
        .createQueryBuilder('inventoryLocation')
        .leftJoin('units', 'unit', 'inventoryLocation.unitId = unit.id')
        .select([
          'inventoryLocation.locationId as locationId',
          'inventoryLocation.sku as sku',
          'inventoryLocation.productName as productName',
          'inventoryLocation.quantity as quantity',
          'inventoryLocation.lockedQuantity as lockedQuantity',
          'inventoryLocation.unitId as unitId',
          'unit.name as unitName',
          'unit.symbol as unitSymbol',
        ])
        .where('inventoryLocation.tenantId = :tenantId', { tenantId })
        .andWhere('inventoryLocation.locationId IN (:...locationIds)', {
          locationIds,
        })
        .andWhere('inventoryLocation.quantity > 0');

      if (keyword) {
        detailQuery.andWhere(
          '(inventoryLocation.sku LIKE :keyword OR inventoryLocation.productName LIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }

      const detailRows = await detailQuery.getRawMany();
      const detailKeys = new Set<string>();

      detailRows.forEach((row) => {
        const quantity = Number(row.quantity || 0);
        const lockedQuantity = Number(row.lockedQuantity || 0);
        detailKeys.add(`${row.locationId}:${row.sku}`);
        addStockItem(row.locationId, {
          sku: row.sku,
          productName: row.productName,
          quantity,
          lockedQuantity,
          availableQuantity: Math.max(quantity - lockedQuantity, 0),
          unitId: row.unitId,
          unitName: row.unitName,
          unitSymbol: row.unitSymbol,
        });
      });

      const fallbackQuery = this.inventoryRepository
        .createQueryBuilder('inventory')
        .leftJoin('units', 'unit', 'inventory.unitId = unit.id')
        .select([
          'inventory.locationId as locationId',
          'inventory.sku as sku',
          'inventory.productName as productName',
          'inventory.quantity as quantity',
          'inventory.unitId as unitId',
          'unit.name as unitName',
          'unit.symbol as unitSymbol',
        ])
        .where('inventory.tenantId = :tenantId', { tenantId })
        .andWhere('inventory.locationId IN (:...locationIds)', { locationIds })
        .andWhere('inventory.quantity > 0');

      if (keyword) {
        fallbackQuery.andWhere(
          '(inventory.sku LIKE :keyword OR inventory.productName LIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }

      const fallbackRows = await fallbackQuery.getRawMany();
      fallbackRows.forEach((row) => {
        const key = `${row.locationId}:${row.sku}`;
        if (detailKeys.has(key)) return;

        const quantity = Number(row.quantity || 0);
        addStockItem(row.locationId, {
          sku: row.sku,
          productName: row.productName,
          quantity,
          lockedQuantity: 0,
          availableQuantity: quantity,
          unitId: row.unitId,
          unitName: row.unitName,
          unitSymbol: row.unitSymbol,
        });
      });
    }

    const enrichedLocations = locations
      .map((location) => {
        const stockItems = stockByLocation.get(location.id) || [];
        const totalQuantity = stockItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const matched = Boolean(keyword) && stockItems.length > 0;

        return {
          ...location,
          stockItems,
          skuCount: stockItems.length,
          totalQuantity,
          hasStock: totalQuantity > 0,
          matched,
        };
      })
      .filter((location) => !keyword || location.matched);

    const warehouses = Array.from(
      new Set(locations.map((location) => location.warehouse).filter(Boolean)),
    ).map((value) => ({ value, label: value }));

    const areas = Array.from(
      new Map(
        locations
          .filter((location) => location.area)
          .map((location) => [
            `${location.warehouse}:${location.area}`,
            {
              value: location.area,
              label: `${location.warehouse}-${location.area}`,
              warehouse: location.warehouse,
            },
          ]),
      ).values(),
    );

    const occupiedLocations = enrichedLocations.filter((location) => location.hasStock).length;

    return {
      warehouses,
      areas,
      locations: enrichedLocations,
      summary: {
        totalLocations: enrichedLocations.length,
        occupiedLocations,
        emptyLocations: enrichedLocations.filter(
          (location) => !location.hasStock && location.status !== LocationStatus.DISABLED,
        ).length,
        disabledLocations: enrichedLocations.filter(
          (location) => location.status === LocationStatus.DISABLED,
        ).length,
        matchedLocations: enrichedLocations.filter((location) => location.matched).length,
      },
    };
  }

  async triggerLight(
    id: string,
    tenantId: string,
    action: LightTaskAction,
    options: {
      duration?: number;
      color?: string;
    } = {},
  ): Promise<LocationLightTask> {
    const location = await this.findOne(id, tenantId);
    const metadata = location.metadata || {};
    const duration = Number(options.duration || metadata.duration || 60);
    const color = options.color || metadata.color || 'yellow';
    const task = this.lightTaskRepository.create({
      tenantId,
      locationId: location.id,
      locationCode: location.code,
      deviceCode: metadata.deviceCode,
      deviceUrl: metadata.deviceUrl,
      ledIndex:
        typeof metadata.ledIndex === 'number'
          ? metadata.ledIndex
          : metadata.ledIndex
            ? Number(metadata.ledIndex)
            : null,
      action,
      duration,
      color,
      payload: {
        locationCode: location.code,
        ledIndex: metadata.ledIndex,
        duration,
        color,
      },
    });

    const savedTask = await this.lightTaskRepository.save(task);

    try {
      await this.sendLightCommand({
        deviceUrl: metadata.deviceUrl,
        action,
        locationCode: location.code,
        ledIndex: savedTask.ledIndex,
        duration,
        color,
      });

      savedTask.status = LightTaskStatus.SUCCESS;
      savedTask.executedAt = new Date();
    } catch (error: any) {
      savedTask.status = LightTaskStatus.FAILED;
      savedTask.errorMessage = error?.message || '灯控设备调用失败';
    }

    return this.lightTaskRepository.save(savedTask);
  }

  /**
   * 查询单个库位
   */
  async findOne(id: string, tenantId: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id, tenantId },
    });
    if (!location) {
      throw new NotFoundException('库位不存在');
    }
    return location;
  }

  /**
   * 根据编码查询库位
   */
  async findByCode(code: string, tenantId: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { code, tenantId },
    });
    if (!location) {
      throw new NotFoundException(`库位编码 ${code} 不存在`);
    }
    return location;
  }

  /**
   * 更新库位
   */
  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
    tenantId: string,
  ): Promise<Location> {
    const location = await this.findOne(id, tenantId);

    // 如果要修改编码，检查新编码是否已存在
    if (updateLocationDto.code && updateLocationDto.code !== location.code) {
      const existing = await this.locationRepository.findOne({
        where: { code: updateLocationDto.code },
      });
      if (existing) {
        throw new BadRequestException(`库位编码 ${updateLocationDto.code} 已存在`);
      }
    }

    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  /**
   * 删除库位
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const location = await this.findOne(id, tenantId);

    const detailStock = await this.inventoryLocationRepository
      .createQueryBuilder('inventoryLocation')
      .where('inventoryLocation.tenantId = :tenantId', { tenantId })
      .andWhere('inventoryLocation.locationId = :locationId', {
        locationId: id,
      })
      .andWhere('inventoryLocation.quantity > 0')
      .getCount();

    const summaryStock = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.locationId = :locationId', { locationId: id })
      .andWhere('inventory.quantity > 0')
      .getCount();

    if (detailStock > 0 || summaryStock > 0) {
      throw new BadRequestException('库位存在库存，不能删除');
    }

    await this.locationRepository.remove(location);
  }

  /**
   * 批量创建库位（预留，用于快速初始化）
   * 例如：创建 A01 仓库 01区 的所有库位
   */
  async batchCreate(
    pattern: {
      warehouse: string;
      area: string;
      shelfStart: number;
      shelfEnd: number;
      levels: number;
      positions: number;
    },
    tenantId: string,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    for (let shelf = pattern.shelfStart; shelf <= pattern.shelfEnd; shelf++) {
      for (let level = 1; level <= pattern.levels; level++) {
        for (let pos = 1; pos <= pattern.positions; pos++) {
          const code = `${pattern.warehouse}-${pattern.area}-${String(shelf).padStart(2, '0')}-${String(level).padStart(2, '0')}-${String(pos).padStart(2, '0')}`;

          const location = this.locationRepository.create({
            code,
            name: `${pattern.warehouse}区${pattern.area}${String(shelf).padStart(2, '0')}架${level}层${pos}位`,
            warehouse: pattern.warehouse,
            area: pattern.area,
            shelf: String(shelf).padStart(2, '0'),
            level: String(level).padStart(2, '0'),
            position: String(pos).padStart(2, '0'),
            type: LocationType.STORAGE,
            status: LocationStatus.AVAILABLE,
            tenantId,
          });

          locations.push(location);
        }
      }
    }

    return this.locationRepository.save(locations);
  }

  // ==================== 硬件预留接口（暂不实现）====================

  /**
   * 更新库位实时数据（预留硬件集成）
   */
  async updateRealtimeData(
    _locationId: string,
    _data: {
      sku?: string;
      quantity?: number;
      dataSource?: 'MANUAL' | 'RFID' | 'SENSOR' | 'AGV';
      deviceIds?: string[];
      sensorData?: {
        temperature?: number;
        humidity?: number;
        weight?: number;
      };
    },
    _tenantId: string,
  ): Promise<void> {
    void _locationId;
    void _data;
    void _tenantId;
    // TODO: 实现库位实时数据更新
    // 预留：当硬件设备（RFID、传感器等）上报数据时调用此接口
  }

  /**
   * 绑定设备到库位（预留硬件集成）
   */
  async bindDevice(_locationId: string, _deviceId: string, _tenantId: string): Promise<void> {
    void _locationId;
    void _deviceId;
    void _tenantId;
    // TODO: 实现设备绑定
    // 预留：将RFID读头、电子标签、传感器等设备绑定到库位
  }

  /**
   * 解绑设备（预留硬件集成）
   */
  async unbindDevice(_locationId: string, _deviceId: string, _tenantId: string): Promise<void> {
    void _locationId;
    void _deviceId;
    void _tenantId;
    // TODO: 实现设备解绑
  }

  /**
   * 获取可选择的库位列表（用于下拉选择）
   */
  async getAvailableForSelection(
    tenantId: string,
    options: {
      keyword?: string;
      warehouse?: string;
      area?: string;
      type?: LocationType;
      status?: LocationStatus;
      limit?: number;
    } = {},
  ): Promise<
    Array<{
      value: string;
      label: string;
      code: string;
      name: string;
      warehouse: string;
      area: string;
      type: LocationType;
      status: LocationStatus;
      capacity?: number;
      usedCapacity?: number;
    }>
  > {
    const { keyword, warehouse, area, type, status, limit = 100 } = options;

    const queryBuilder = this.locationRepository
      .createQueryBuilder('location')
      .where('location.tenantId = :tenantId', { tenantId });

    // 默认只显示可用的库位，除非明确指定了状态
    if (status) {
      queryBuilder.andWhere('location.status = :status', { status });
    } else {
      queryBuilder.andWhere('location.status IN (:...statuses)', {
        statuses: [LocationStatus.AVAILABLE, LocationStatus.OCCUPIED],
      });
    }

    if (keyword) {
      queryBuilder.andWhere('(location.code LIKE :keyword OR location.name LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (warehouse) {
      queryBuilder.andWhere('location.warehouse = :warehouse', { warehouse });
    }

    if (area) {
      queryBuilder.andWhere('location.area = :area', { area });
    }

    if (type) {
      queryBuilder.andWhere('location.type = :type', { type });
    }

    queryBuilder
      .orderBy('location.warehouse', 'ASC')
      .addOrderBy('location.area', 'ASC')
      .addOrderBy('location.shelf', 'ASC')
      .addOrderBy('location.level', 'ASC')
      .addOrderBy('location.position', 'ASC')
      .take(limit);

    const locations = await queryBuilder.getMany();

    return locations.map((location) => ({
      value: location.id,
      label: `${location.code} - ${location.name}`,
      code: location.code,
      name: location.name,
      warehouse: location.warehouse,
      area: location.area,
      type: location.type,
      status: location.status,
      capacity: location.capacity ? Number(location.capacity) : undefined,
      usedCapacity: 0, // TODO: 计算已用容量
    }));
  }

  async getStockLocations(
    tenantId: string,
    sku: string,
  ): Promise<
    Array<{
      value: string;
      label: string;
      code: string;
      name: string;
      quantity: number;
    }>
  > {
    if (!sku) return [];

    const detailRows = await this.inventoryLocationRepository
      .createQueryBuilder('inventoryLocation')
      .innerJoin('locations', 'location', 'inventoryLocation.locationId = location.id')
      .select([
        'location.id as value',
        'location.code as code',
        'location.name as name',
        'inventoryLocation.quantity as quantity',
        'inventoryLocation.lockedQuantity as lockedQuantity',
      ])
      .where('inventoryLocation.tenantId = :tenantId', { tenantId })
      .andWhere('inventoryLocation.sku = :sku', { sku })
      .andWhere('(inventoryLocation.quantity - COALESCE(inventoryLocation.lockedQuantity, 0)) > 0')
      .andWhere('location.status <> :disabled', {
        disabled: LocationStatus.DISABLED,
      })
      .orderBy('location.warehouse', 'ASC')
      .addOrderBy('location.area', 'ASC')
      .addOrderBy('location.shelf', 'ASC')
      .addOrderBy('location.level', 'ASC')
      .addOrderBy('location.position', 'ASC')
      .getRawMany();

    if (detailRows.length > 0) {
      return detailRows.map((row) => {
        const availableQuantity = Math.max(
          Number(row.quantity || 0) - Number(row.lockedQuantity || 0),
          0,
        );
        return {
          value: row.value,
          label: `${row.code} - ${row.name} / 可用 ${availableQuantity}`,
          code: row.code,
          name: row.name,
          quantity: availableQuantity,
        };
      });
    }

    const fallbackRows = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .innerJoin('locations', 'location', 'inventory.locationId = location.id')
      .select([
        'location.id as value',
        'location.code as code',
        'location.name as name',
        'inventory.quantity as quantity',
        'inventory.lockedQuantity as lockedQuantity',
      ])
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.sku = :sku', { sku })
      .andWhere('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) > 0')
      .andWhere('inventory.locationId IS NOT NULL')
      .andWhere('location.status <> :disabled', {
        disabled: LocationStatus.DISABLED,
      })
      .orderBy('location.warehouse', 'ASC')
      .addOrderBy('location.area', 'ASC')
      .addOrderBy('location.shelf', 'ASC')
      .addOrderBy('location.level', 'ASC')
      .addOrderBy('location.position', 'ASC')
      .getRawMany();

    return fallbackRows.map((row) => {
      const availableQuantity = Math.max(
        Number(row.quantity || 0) - Number(row.lockedQuantity || 0),
        0,
      );
      return {
        value: row.value,
        label: `${row.code} - ${row.name} / 可用 ${availableQuantity}`,
        code: row.code,
        name: row.name,
        quantity: availableQuantity,
      };
    });
  }
}
