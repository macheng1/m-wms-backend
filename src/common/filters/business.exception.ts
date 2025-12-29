// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  private readonly businessCode: number;
  private readonly businessData: any;

  constructor(message: string, code: number = 10001, data: any = null) {
    // 依然维持 HTTP 400 或 200 的基类状态，但我们主要用构造函数传参
    super(message, HttpStatus.BAD_REQUEST);
    this.businessCode = code;
    this.businessData = data;
  }

  getBusinessCode() {
    return this.businessCode;
  }

  getBusinessData() {
    return this.businessData;
  }
}
