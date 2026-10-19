import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import {
  loginRequestSchema,
  type LoginRequest,
} from '@workspace/contracts/auth';

@Injectable()
export class LoginRequestPipe implements PipeTransform<unknown, LoginRequest> {
  transform(value: unknown): LoginRequest {
    const result = loginRequestSchema.safeParse(value);

    if (!result.success) {
      const issue = result.error.issues[0];
      throw new BadRequestException({
        message:
          issue?.code === 'unrecognized_keys'
            ? '请求中包含不允许的字段。'
            : (issue?.message ?? '请求参数不正确。'),
      });
    }

    return result.data;
  }
}
