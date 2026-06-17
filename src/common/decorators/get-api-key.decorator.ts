import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyEntity } from '../../modules/auth/entities/api-key.entity';

export const GetApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request['apiKey'];
  },
);
