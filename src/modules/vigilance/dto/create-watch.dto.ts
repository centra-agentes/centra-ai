import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWatchDto {
  @ApiProperty({ example: '05088400300220240205200', description: 'Número de radicación (23 dígitos)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(23)
  @MaxLength(30)
  numeroRadicado: string;

  @ApiPropertyOptional({ example: 'Caso principal Acme Corp', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
