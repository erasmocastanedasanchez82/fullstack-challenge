import { Inject, Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { CreateProduct, ListProductsCriteria, Product } from '../../../../domain/products/product';
import { ProductRepositoryPort } from '../../../../ports/product-repository.port';
import { DatabaseService } from '../../../../infrastructure/database/database.service';

interface ProductRow extends QueryResultRow {
  id: number;
  name: string;
  category: string;
  price: string;
  is_active: boolean;
  stock: number;
  created_at: Date | string;
}

@Injectable()
export class PostgresProductRepository implements ProductRepositoryPort {
  constructor(
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
  ) {}

  async findAll(criteria: ListProductsCriteria): Promise<Product[]> {
    const values: unknown[] = [];
    const whereClauses: string[] = [];

    if (criteria.activeOnly) {
      values.push(true);
      whereClauses.push(`is_active = $${values.length}`);
    }

    if (criteria.category) {
        values.push(criteria.category);
        whereClauses.push(`category = $${values.length}`);
    }

    if (criteria.maxPrice !== undefined) {
        values.push(criteria.maxPrice);
        whereClauses.push(`price <= $${values.length}`);
    }

    const whereStatement =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await this.databaseService.query<ProductRow>(
      `
        SELECT id, name, category, price, is_active, stock, created_at
        FROM products
        ${whereStatement}
        ORDER BY created_at DESC
      `,
      values,
    );

    return result.rows.map(mapProductRow);
  }

  async create(input: CreateProduct): Promise<Product> {
    const result = await this.databaseService.query<ProductRow>(
      `
        INSERT INTO products (name, category, price, is_active, stock)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, category, price, is_active, stock, created_at
      `,
      [input.name, input.category, input.price, input.isActive, input.stock],
    );

    return mapProductRow(result.rows[0]);
  }
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    isActive: row.is_active,
    stock: row.stock,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}
