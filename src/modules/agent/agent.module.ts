import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { VigilanceModule } from '../vigilance/vigilance.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [VigilanceModule, AdminModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
