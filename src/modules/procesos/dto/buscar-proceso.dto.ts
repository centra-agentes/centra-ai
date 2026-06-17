import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export enum TipoPersona {
  NATURAL = 'NAT',
  JURIDICA = 'JUR',
}

export enum TipoSujeto {
  DEMANDANTE = 'D',
  DEMANDADO = 'R',
  CUALQUIERA = 'C',
}

// ─── Búsqueda por nombre ───────────────────────────────────────────────────
export class BuscarPorNombreDto {
  @ApiProperty({ example: 'JUAN', description: 'Nombre o razón social' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'PEREZ', description: 'Apellido (solo persona natural)' })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional({ enum: TipoPersona, default: TipoPersona.NATURAL })
  @IsOptional()
  @IsEnum(TipoPersona)
  tipoPersona?: TipoPersona = TipoPersona.NATURAL;

  @ApiPropertyOptional({ enum: TipoSujeto, default: TipoSujeto.CUALQUIERA })
  @IsOptional()
  @IsEnum(TipoSujeto)
  tipoSujeto?: TipoSujeto = TipoSujeto.CUALQUIERA;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantRecords?: number = 10;
}

// ─── Búsqueda por radicado ────────────────────────────────────────────────
export class BuscarPorRadicadoDto {
  @ApiProperty({
    example: '11001310300120200001200',
    description: 'Número de radicación de 23 dígitos',
  })
  @IsNumberString()
  @Length(23, 23, { message: 'El número de radicación debe tener exactamente 23 dígitos' })
  numero: string;
}

// ─── Búsqueda empresa ─────────────────────────────────────────────────────
export class BuscarEmpresaDto {
  @ApiProperty({ example: 'BANCOLOMBIA', description: 'Razón social de la empresa' })
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @ApiPropertyOptional({ enum: TipoSujeto, default: TipoSujeto.CUALQUIERA })
  @IsOptional()
  @IsEnum(TipoSujeto)
  tipoSujeto?: TipoSujeto = TipoSujeto.CUALQUIERA;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantRecords?: number = 10;
}
