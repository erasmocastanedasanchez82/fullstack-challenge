export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProduct {
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}

export interface ListProductsCriteria {
    activeOnly: boolean;
    category?: string;
    maxPrice?: number;
}
