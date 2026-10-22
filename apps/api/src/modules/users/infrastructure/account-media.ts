import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type {
  AvatarProcessor,
  InvitationTokens,
} from '../application/accounts.repository';
import { AccountError } from '../domain/account-policy';

@Injectable()
export class NodeInvitationTokens implements InvitationTokens {
  create(): string {
    return randomBytes(32).toString('base64url');
  }
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

@Injectable()
export class SharpAvatarProcessor implements AvatarProcessor {
  async process(input: string): Promise<string> {
    try {
      if (
        input.length > 96_000 ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(input)
      )
        throw new Error('Invalid image');
      const bytes = Buffer.from(input.slice(input.indexOf(',') + 1), 'base64');
      const image = sharp(bytes, {
        limitInputPixels: 16_000_000,
        failOn: 'warning',
        animated: false,
      });
      const metadata = await image.metadata();
      if (
        !['png', 'jpeg', 'webp'].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('Invalid format');
      const output = await image
        .rotate()
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
      return `data:image/webp;base64,${output.toString('base64')}`;
    } catch {
      throw new AccountError(
        'invalid',
        '头像无法读取，请重新选择 PNG、JPEG 或 WebP 静态图片。',
      );
    }
  }
}
