import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ListProductsQueryDto {
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    activeOnly?: boolean;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    maxPrice?: number;
}