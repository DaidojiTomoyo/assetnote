import {
  accessCapabilities,
  assertCanInvite,
  assertManager,
  inviteRoles,
} from './account-policy';
import type { User, UserRole } from './user';

function user(role: UserRole, id = 'actor'): User {
  return { id, email: 'account@example.com', role, status: 'ACTIVE' };
}
describe('account policy', () => {
  it('expresses invitation capabilities without numeric role ordering', () => {
    expect(inviteRoles(user('SUPER_ADMIN'))).toEqual(['ADMIN', 'USER']);
    expect(inviteRoles(user('ADMIN'))).toEqual(['USER']);
    expect(inviteRoles(user('USER'))).toEqual([]);
    expect(inviteRoles({ ...user('SUPER_ADMIN'), status: 'DISABLED' })).toEqual(
      [],
    );
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'USER'] as const)
      expect(() => assertCanInvite(user(role), 'SUPER_ADMIN')).toThrow();
    expect(() => assertManager(user('USER'))).toThrow();
  });
  it('protects self and every super administrator from access mutations', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'USER'] as const) {
      expect(accessCapabilities(user(role), user(role))).toEqual({
        canChangeStatus: false,
        roleOptions: [],
      });
      expect(
        accessCapabilities(user(role), user('SUPER_ADMIN', 'other')),
      ).toEqual({ canChangeStatus: false, roleOptions: [] });
    }
  });
  it('allows administrators to control ordinary user status but never roles or peer administrators', () => {
    expect(accessCapabilities(user('ADMIN'), user('USER', 'other'))).toEqual({
      canChangeStatus: true,
      roleOptions: [],
    });
    expect(accessCapabilities(user('ADMIN'), user('ADMIN', 'other'))).toEqual({
      canChangeStatus: false,
      roleOptions: [],
    });
    expect(
      accessCapabilities(user('SUPER_ADMIN'), user('ADMIN', 'other')),
    ).toEqual({ canChangeStatus: true, roleOptions: ['ADMIN', 'USER'] });
    expect(
      accessCapabilities(
        { ...user('SUPER_ADMIN'), status: 'DISABLED' },
        user('USER', 'other'),
      ).canChangeStatus,
    ).toBe(false);
  });
});
