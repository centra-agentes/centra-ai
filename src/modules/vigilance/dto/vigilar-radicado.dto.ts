import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VigilarRadicadoDto {
  @ApiProperty({
    example: '05088400300220240205200',
    description: 'Número de radicación de 23 dígitos',
  })
  @IsString()
  @IsNotEmpty()
  @Length(23, 23, { message: 'El número de radicación debe tener exactamente 23 dígitos' })
  numero: string;

  @ApiPropertyOptional({ default: 1, description: 'Página de procesos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({ default: 1, description: 'Página de actuaciones' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paginaActuaciones?: number = 1;
}
