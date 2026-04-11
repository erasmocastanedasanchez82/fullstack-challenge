# Solution

## What I Changed

### 1. Bug fix — `GET /products` not filtering active products by default

**File:** `src/adapters/inbound/http/products/products.controller.ts`

#### 1.1 Wrong default value for `activeOnly`

The `activeOnly` default was `false`, meaning the endpoint returned all products (including inactive ones) when no query parameter was provided. The intended behaviour described in the README is to return only active products by default.

```ts
// Before
activeOnly: query.activeOnly ?? false,
// After
activeOnly: query.activeOnly ?? true,
```

#### 1.2 `activeOnly` query param not being parsed as boolean

HTTP query parameters are always received as plain strings. The `@Transform` decorator in the DTO was intended to convert `"true"`/`"false"` to proper booleans, but it was not executing at runtime because `tsx` (the dev runner) uses esbuild internally instead of the official TypeScript compiler, and esbuild ignores `emitDecoratorMetadata` — the flag that allows decorators like `@Transform` to emit type metadata at runtime.

As a result, `query.activeOnly` always arrived as a string, so the repository condition `if (criteria.activeOnly)` treated `"true"` and `"false"` as truthy strings and always filtered by active products, ignoring the actual intent of the parameter.

The fix moves the string-to-boolean conversion explicitly into the controller, where it is not dependent on decorator metadata:

```ts
// Before
activeOnly: query.activeOnly ?? true,

// After
let activeOnly: boolean | undefined;
if (query.activeOnly === undefined) {
  activeOnly = true; // default: return only active products
} else {
  activeOnly = String(query.activeOnly) === 'true'; // explicit string-to-boolean conversion
}
```

#### 1.3 `activeOnly=false` filtering inactive products instead of returning all

**File:** `src/adapters/outbound/persistence/postgres/postgres-product.repository.ts`

The repository used a truthy check `if (criteria.activeOnly)`, which only distinguishes between truthy and falsy values. This means `false` and `undefined` were treated identically — neither added a WHERE clause, so both returned all products. The intended behaviour is:

- `activeOnly: true` → return only active products
- `activeOnly: false` → return all products (no filter)

Changing the condition to a strict equality check makes the intent explicit and correct:

```ts
// Before
if (criteria.activeOnly) {

// After
if (criteria.activeOnly === true) {
```

### 2. Filters — `GET /products?category=...&maxPrice=...`

Added support for two new optional query parameters, wired end-to-end through all layers.

**`src/domain/products/product.ts`** — extended `ListProductsCriteria`:

```ts
export interface ListProductsCriteria {
  activeOnly: boolean;
  category?: string;
  maxPrice?: number;
}
```

**`src/adapters/inbound/http/products/dto/list-products-query.dto.ts`** — added validated query params:

```ts
@IsOptional()
@IsString()
category?: string;

@IsOptional()
@Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
@IsNumber({ maxDecimalPlaces: 2 })
@Min(0)
maxPrice?: number;
```

**`src/adapters/inbound/http/products/products.controller.ts`** — forwarded new params to the use case:

```ts
return this.listProductsUseCase.execute({
  activeOnly: query.activeOnly ?? true,
  category: query.category,
  maxPrice: query.maxPrice,
});
```

**`src/adapters/outbound/persistence/postgres/postgres-product.repository.ts`** — added dynamic WHERE clauses:

```ts
if (criteria.category) {
  values.push(criteria.category);
  whereClauses.push(`category = $${values.length}`);
}

if (criteria.maxPrice !== undefined) {
  values.push(criteria.maxPrice);
  whereClauses.push(`price <= $${values.length}`);
}
```

The frontend (`frontend/src/api.ts`) was already passing `category` and `maxPrice` as query params, so no frontend changes were needed for the filters.

---

### 3. New field — `stock` (integer), end-to-end

**`src/infrastructure/database/migrations/002_add_stock_to_products.sql`** — new migration:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0);
```

**`src/infrastructure/database/seeds/001_seed_products.sql`** — updated all `INSERT` statements to include a `stock` value per product.

**`src/domain/products/product.ts`** — added `stock` to both `Product` and `CreateProduct` interfaces.

**`src/adapters/inbound/http/products/dto/create-product-request.dto.ts`** — added validated field:

```ts
@IsInt()
@Min(0)
stock!: number;
```

**`src/adapters/inbound/http/products/products.controller.ts`** — forwarded `stock` to the use case.

**`src/adapters/outbound/persistence/postgres/postgres-product.repository.ts`** — added `stock` to:
- `ProductRow` interface
- `SELECT` clause in `findAll`
- `INSERT` and `RETURNING` clause in `create`
- `mapProductRow` mapping function

The frontend already had the `stock` column in the table and `stock?: number` in the `Product` type, so no frontend changes were needed.

---

## How I Validated It

### Automated tests

```bash
npm test
```

All tests pass, including the previously failing test that exposed the `activeOnly` default bug.

### Manual curl tests

Default behaviour — only active products, newest first:
```bash
curl "http://localhost:3000/products"
```

All products including inactive:
```bash
curl "http://localhost:3000/products?activeOnly=false"
```

Filter by category:
```bash
curl "http://localhost:3000/products?category=rings"
```

Filter by max price:
```bash
curl "http://localhost:3000/products?maxPrice=100"
```

Combined filters:
```bash
curl "http://localhost:3000/products?category=earrings&maxPrice=100"
```

Create a product with stock:
```bash
curl -X POST "http://localhost:3000/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"North Star Ring","category":"rings","price":149,"isActive":true,"stock":99}'
```

### Frontend

Verified the full filter flow (active toggle, category input, max price input) and confirmed the `Stock` column renders correctly for all products.

---

## What I Would Improve With More Time

**Pagination** — `GET /products` currently returns all matching rows in a single response. A `limit`/`offset` or cursor-based pagination strategy would be necessary at any realistic data volume.

**Database indexes** — the `category` and `price` columns are now filterable but unindexed. Adding indexes would prevent full table scans as the catalog grows:

```sql
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_price ON products (price);
CREATE INDEX idx_products_is_active ON products (is_active);
```

**Input validation robustness** — `maxPrice` currently accepts any non-negative number passed as a query string. Adding an upper bound and rejecting non-numeric strings with a clearer error message would improve the developer experience.

**Migration tracking** — the current migration runner re-applies all `.sql` files on every run unless already guarded with `IF NOT EXISTS`. A migrations table tracking which files have already been applied (similar to Flyway or Liquibase) would make the setup safer in non-development environments.

**Error handling** — the API currently leaks raw database errors to the HTTP response on unexpected failures. A global exception filter mapping `pg` errors to consistent JSON responses would be a worthwhile addition.

**Stock constraint on create** — making `stock` required in the DTO (`@IsInt()` without `@IsOptional()`) is intentional: a product without a known stock level should not be silently created with a default of 0. This matches how the field is modelled in the domain.

---

## AI Tools Used

I used **Claude (Anthropic)** as a coding assistant throughout this exercise — primarily to:

- Compare and understand rapidly the existing codebase, especially the flow of data through the layers and the structure of the repository queries.
- Generate documentation for the solution explanation in this file from proposed changes.

All generated suggestions were reviewed, understood, and adapted before being applied. I am fully able to explain every change made in this solution.