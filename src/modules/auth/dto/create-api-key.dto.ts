import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Frontend Production',
    description: 'Nombre descriptivo para identificar esta API key',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00Z',
    description:
      'Fecha de expiración en formato ISO 8601. Si se omite, la key no tiene fecha de expiración.',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
