import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';

import { CreateProductUseCase } from '../../../../application/products/use-cases/create-product.use-case';
import { ListProductsUseCase } from '../../../../application/products/use-cases/list-products.use-case';
import { Product } from '../../../../domain/products/product';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(ListProductsUseCase)
    private readonly listProductsUseCase: ListProductsUseCase,
    @Inject(CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,
  ) {}

  @Get()
  listProducts(@Query() query: ListProductsQueryDto): Promise<Product[]> {
    return this.listProductsUseCase.execute({
      activeOnly: query.activeOnly ?? true,
    });
  }

  @Post()
  createProduct(@Body() input: CreateProductRequestDto): Promise<Product> {
    return this.createProductUseCase.execute({
      name: input.name,
      category: input.category,
      price: input.price,
      isActive: input.isActive ?? true,
    });
  }
}
