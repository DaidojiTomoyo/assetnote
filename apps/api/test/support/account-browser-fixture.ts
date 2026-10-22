import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureHttpApplication } from '../../src/common/bootstrap/configure-http-application';
import applicationConfig, {
  type ApplicationConfig,
} from '../../src/common/config/application.config';
import { PrismaService } from '../../src/common/database/prisma.service';
import { Argon2PasswordHasher } from '../../src/modules/users/infrastructure/argon2-password-hasher';
import { createPostgreSqlTestSchema } from './postgresql-test-schema';

// Explicit local browser verification only: disposable test database, never the dev connection.
async function main() {
  if (process.env['NODE_ENV'] !== 'test')
    throw new Error('Browser fixture requires NODE_ENV=test');
  const database = await createPostgreSqlTestSchema();
  const config: ApplicationConfig = {
    environment: 'test',
    port: 3301,
    webOrigin: 'http://localhost:3300',
    sessionCookie: { name: 'assetnote_session', secure: false },
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(database.prisma)
    .overrideProvider(applicationConfig.KEY)
    .useValue(config)
    .compile();
  const app = module.createNestApplication();
  configureHttpApplication(app, config);
  try {
    const passwordHash = await new Argon2PasswordHasher().hash(
      'design preview passphrase',
    );
    for (const [nickname, email, role, status] of [
      ['林然', 'linran@example.test', 'SUPER_ADMIN', 'ACTIVE'],
      ['周晓', 'zhouxiao@example.test', 'ADMIN', 'ACTIVE'],
      ['陈安', 'chenan@example.test', 'USER', 'ACTIVE'],
      ['何宁', 'hening@example.test', 'USER', 'DISABLED'],
      ['李悦', 'liyue@example.test', 'USER', 'ACTIVE'],
      ['沈舟', 'shenzhou@example.test', 'USER', 'ACTIVE'],
    ] as const)
      await database.prisma.user.create({
        data: { nickname, email, passwordHash, role, status },
      });
    await app.listen(config.port, '127.0.0.1');
    let closing = false;
    async function close() {
      if (closing) return;
      closing = true;
      await app.close();
      await database.close();
    }
    process.once('SIGINT', () => {
      void close();
    });
    process.once('SIGTERM', () => {
      void close();
    });
    process.stdout.write(
      'Isolated account browser fixture ready on localhost:3301.\n',
    );
  } catch (error) {
    await app.close();
    await database.close();
    throw error;
  }
}
void main().catch(() => {
  process.stderr.write('Unable to start isolated browser fixture.\n');
  process.exitCode = 1;
});
