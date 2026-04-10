export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  stock: number;
  createdAt: string;
}

export interface CreateProduct {
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  stock: number;
}

export interface ListProductsCriteria {
    activeOnly: boolean;
    category?: string;
    maxPrice?: number;
}
