import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export enum CategoriaPublicacion {
  ACCIONES_TUTELA = "Acciones de Tutela",
  AUTOS_MASIVO = "Autos masivo",
  AVISOS = "Avisos",
  COMUNICACIONES_JURIDICAS = "Comunicaciones jurídicas",
  CONTROL_LEGALIDAD = "Control de legalidad",
  EDICTOS = "Edictos",
  ENTRADAS_DESPACHO = "Entradas al despacho",
  FIJACIONES = "Fijaciones",
  INCIDENTE_DESACATO = "Incidente de Desacato",
  INFORMES_ACUMULACION = "Informes de Acumulación",
  NOTIFICACIONES = "Notificaciones",
  NOTIFICACIONES_AVISO = "Notificaciones por Aviso",
  NOTIFICACIONES_ESTADOS = "Notificaciones por Estados",
  OFICIOS = "Oficios",
  REMATES = "Remates",
  REPARTO = "Reparto",
  SENTENCIAS = "Sentencias",
  TRASLADOS = "Traslados especiales y ordinarios",
}

export class FiltrarPublicacionesDto {
  @ApiPropertyOptional({
    example: "05",
    description: "Código DANE del departamento (ej: 05=Antioquia, 11=Bogotá)",
  })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({
    example: "178845807",
    description:
      "ID de categoría del departamento (requerido junto con departamento)",
  })
  @IsOptional()
  @IsString()
  idDeptoIdCategory?: string;

  @ApiPropertyOptional({
    example: "05001",
    description: "Código DANE del municipio (ej: 05001=Medellín, 11001=Bogotá)",
  })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ description: "Código del despacho judicial" })
  @IsOptional()
  @IsString()
  despacho?: string;

  @ApiPropertyOptional({ enum: CategoriaPublicacion })
  @IsOptional()
  @IsEnum(CategoriaPublicacion)
  categoria?: CategoriaPublicacion;

  @ApiPropertyOptional({
    example: "2026-02-01",
    description: "Fecha inicio (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({
    example: "2026-02-28",
    description: "Fecha fin (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({
    default: false,
    description: "Ver totales por categoría",
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  verTotales?: boolean = false;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  cantRecords?: number = 20;
}

// ─── Histórico (directorio de despachos pre-mayo 2024) ───────────────────────

export class BuscarHistoricoDto {
  @ApiPropertyOptional({
    description: "Filtro de texto parcial por departamento (ej: ANTIOQUIA)",
  })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({ description: "Filtro de texto parcial por municipio" })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ description: "Filtro de texto parcial por entidad" })
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    maximum: 75,
    description: "Registros por página (máx 75, valores soportados: 5,10,20,30,50,75)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(75)
  cantRecords?: number = 20;
}
