import sharp from 'sharp';
import { NodeInvitationTokens, SharpAvatarProcessor } from './account-media';

describe('account media and invitation tokens', () => {
  it('uses independent random 256-bit bearer tokens and only hashes for persistence', () => {
    const tokens = new NodeInvitationTokens();
    const first = tokens.create();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokens.create()).not.toBe(first);
    expect(tokens.hash(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(tokens.hash(first)).toBe(tokens.hash(first));
  });
  it('decodes, resizes, and strips uploaded image metadata', async () => {
    const input = await sharp({
      create: { width: 100, height: 70, channels: 3, background: '#b9ef46' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const result = await new SharpAvatarProcessor().process(
      `data:image/jpeg;base64,${input.toString('base64')}`,
    );
    const metadata = await sharp(
      Buffer.from(result.split(',')[1] ?? '', 'base64'),
    ).metadata();
    expect(metadata).toMatchObject({ width: 256, height: 256, format: 'webp' });
    expect(metadata.exif).toBeUndefined();
  });
  it.each([
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,aGVsbG8=',
    'data:image/jpeg;base64,' + 'a'.repeat(96_000),
  ])('rejects unsupported, corrupt or oversized image data', async (input) => {
    await expect(new SharpAvatarProcessor().process(input)).rejects.toThrow(
      '头像无法读取',
    );
  });
});
