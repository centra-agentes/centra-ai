import { Body, Controller, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { MasterKeyGuard } from '../auth/guards/master-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AdminService } from './admin.service';
import { buildResponse } from '../../common/interfaces/api-response.interface';

class UpdateAnthropicKeyDto {
  @IsString()
  @MinLength(10)
  value: string;
}

@Controller('admin')
@Public()
@UseGuards(MasterKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('anthropic-key')
  @HttpCode(HttpStatus.OK)
  async updateAnthropicKey(@Body() dto: UpdateAnthropicKeyDto) {
    await this.adminService.setAnthropicKey(dto.value);
    return buildResponse({ updated: true });
  }
}
