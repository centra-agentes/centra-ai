import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateWatchDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime for a one-time scheduled check. Send null to cancel.' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? null : value))
  @IsISO8601({}, { message: 'scheduledCheckAt must be a valid ISO 8601 date string or null' })
  scheduledCheckAt?: string | null;
}
