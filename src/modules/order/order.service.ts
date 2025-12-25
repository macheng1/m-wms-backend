import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto, tenantId: string): Promise<Order> {
    const order = this.orderRepository.create({
      ...createOrderDto,
      tenantId,
    });
    return this.orderRepository.save(order);
  }

  async findAll(tenantId: string): Promise<Order[]> {
    return this.orderRepository.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string): Promise<Order> {
    return this.orderRepository.findOne({ where: { id, tenantId } });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, tenantId: string): Promise<Order> {
    await this.orderRepository.update({ id, tenantId }, updateOrderDto);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.orderRepository.delete({ id, tenantId });
  }
}
