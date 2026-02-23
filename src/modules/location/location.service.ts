import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location, LocationType, LocationStatus } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
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
  async create(
    createLocationDto: CreateLocationDto,
    tenantId: string,
  ): Promise<Location> {
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
      queryBuilder.andWhere(
        '(location.code LIKE :keyword OR location.name LIKE :keyword)',
        { keyword: `%${filters.keyword}%` },
      );
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
    if (
      updateLocationDto.code &&
      updateLocationDto.code !== location.code
    ) {
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

    // TODO: 检查库位是否有库存，有库存则不能删除

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
    locationId: string,
    data: {
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
    tenantId: string,
  ): Promise<void> {
    // TODO: 实现库位实时数据更新
    // 预留：当硬件设备（RFID、传感器等）上报数据时调用此接口
  }

  /**
   * 绑定设备到库位（预留硬件集成）
   */
  async bindDevice(
    locationId: string,
    deviceId: string,
    tenantId: string,
  ): Promise<void> {
    // TODO: 实现设备绑定
    // 预留：将RFID读头、电子标签、传感器等设备绑定到库位
  }

  /**
   * 解绑设备（预留硬件集成）
   */
  async unbindDevice(
    locationId: string,
    deviceId: string,
    tenantId: string,
  ): Promise<void> {
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
      queryBuilder.andWhere(
        '(location.code LIKE :keyword OR location.name LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
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
}
