import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationType, LocationStatus } from './entities/location.entity';
import { Device } from './entities/device.entity';
import { InventoryLocation } from './entities/inventory-location.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { PtlLocationBinding } from '../ptl/entities/ptl-location-binding.entity';
import { PtlService } from '../ptl/ptl.service';
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
    @InjectRepository(PtlLocationBinding)
    private ptlBindingRepository: Repository<PtlLocationBinding>,
    private ptlService: PtlService,
  ) {}

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
        // 库存健康色：与物理货位灯底色同规则（green 正常 / yellow 告急 / red 归零 / null 空库位）
        stockColor: 'green' | 'yellow' | 'red' | null;
        ptl: {
          bound: boolean;
          bindingId?: string;
          controllerId?: string;
          controllerCode?: string;
          controllerName?: string;
          controllerStatus?: string;
          ledIndex?: number;
          defaultColor?: string;
        };
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
    const ptlByLocation = new Map<string, any>();

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
        .leftJoin('products', 'product', 'inventoryLocation.sku = product.code AND product.tenantId = :tenantId')
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
          '(inventoryLocation.sku LIKE :keyword OR inventoryLocation.productName LIKE :keyword OR product.barcode LIKE :keyword)',
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
        .leftJoin('products', 'product', 'inventory.sku = product.code AND product.tenantId = :tenantId')
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
          '(inventory.sku LIKE :keyword OR inventory.productName LIKE :keyword OR product.barcode LIKE :keyword)',
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

      const ptlRows = await this.ptlBindingRepository
        .createQueryBuilder('binding')
        .leftJoin(
          Device,
          'device',
          'device.id = binding.deviceId AND device.tenantId = :tenantId',
          {
            tenantId,
          },
        )
        .select([
          'binding.id as bindingId',
          'binding.locationId as locationId',
          'binding.deviceId as controllerId',
          'binding.ledIndex as ledIndex',
          'binding.defaultColor as defaultColor',
          'device.code as controllerCode',
          'device.name as controllerName',
          'device.status as controllerStatus',
        ])
        .where('binding.tenantId = :tenantId', { tenantId })
        .andWhere('binding.locationId IN (:...locationIds)', { locationIds })
        .andWhere('binding.enabled = 1')
        .getRawMany();

      ptlRows.forEach((row) => {
        ptlByLocation.set(row.locationId, {
          bound: true,
          bindingId: row.bindingId,
          controllerId: row.controllerId,
          controllerCode: row.controllerCode,
          controllerName: row.controllerName,
          controllerStatus: row.controllerStatus,
          ledIndex:
            row.ledIndex === null || row.ledIndex === undefined ? undefined : Number(row.ledIndex),
          defaultColor: row.defaultColor,
        });
      });
    }

    // 每个库位的库存健康色（按 SKU 全仓总量 vs 安全库存，与物理灯底色同规则）
    const stockColorByLocation =
      locationIds.length > 0
        ? await this.ptlService.getLocationStockColors(tenantId, locationIds)
        : new Map<string, 'green' | 'yellow' | 'red' | null>();

    // 当前 warehouse/area 范围内的全部库位（不受 keyword 影响），统计卡基于此集合
    const enrichedScoped = locations.map((location) => {
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
        stockColor: stockColorByLocation.get(location.id) ?? null,
        ptl: ptlByLocation.get(location.id) || { bound: false },
      };
    });

    // 搜索时只把命中库位返回给可视化看板；统计卡仍用全量 enrichedScoped
    const visibleLocations = keyword
      ? enrichedScoped.filter((location) => location.matched)
      : enrichedScoped;

    // 仓库/库区下拉项：取全租户全量，不受当前 warehouse/area 过滤影响，否则选了就切不回去
    const filterRows = await this.locationRepository
      .createQueryBuilder('location')
      .select('location.warehouse', 'warehouse')
      .addSelect('location.area', 'area')
      .where('location.tenantId = :tenantId', { tenantId })
      .distinct(true)
      .getRawMany();

    const warehouses = Array.from(
      new Set(filterRows.map((row) => row.warehouse).filter(Boolean)),
    ).map((value) => ({ value, label: value }));

    const areas = Array.from(
      new Map(
        filterRows
          .filter((row) => row.area)
          .map((row) => [
            `${row.warehouse}:${row.area}`,
            {
              value: row.area,
              label: `${row.warehouse}-${row.area}`,
              warehouse: row.warehouse,
            },
          ]),
      ).values(),
    );

    return {
      warehouses,
      areas,
      locations: visibleLocations,
      summary: {
        totalLocations: enrichedScoped.length,
        occupiedLocations: enrichedScoped.filter((location) => location.hasStock).length,
        emptyLocations: enrichedScoped.filter(
          (location) => !location.hasStock && location.status !== LocationStatus.DISABLED,
        ).length,
        disabledLocations: enrichedScoped.filter(
          (location) => location.status === LocationStatus.DISABLED,
        ).length,
        matchedLocations: enrichedScoped.filter((location) => location.matched).length,
      },
    };
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
