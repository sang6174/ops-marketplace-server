import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdminProfile } from '@domain/entities/identities/AdminProfile';
import { UserId } from '../../value-objects/UserId';
import { SubAdminRole } from '../enums.enum';

describe('AdminProfile', () => {
  let adminProfile: AdminProfile;
  const mockUserId = UserId.create('user-123');
  const mockId = 'admin-456';
  const mockCreatedAt = new Date('2025-01-01');

  beforeEach(() => {
    adminProfile = AdminProfile.create({
      id: mockId,
      userId: mockUserId,
      subRole: SubAdminRole.CUSTOMER_SUPPORT,
      createdAt: mockCreatedAt,
    });
  });

  describe('create()', () => {
    it('should create admin profile with given sub-role', () => {
      expect(adminProfile.id).toBe(mockId);
      expect(adminProfile.userId).toBe(mockUserId);
      expect(adminProfile.subRole).toBe(SubAdminRole.CUSTOMER_SUPPORT);
      expect(adminProfile.createdAt).toBe(mockCreatedAt);
      expect(adminProfile.updatedAt).toBe(mockCreatedAt);
    });
  });

  describe('reconstitute()', () => {
    it('should recreate admin profile', () => {
      const reconstituted = AdminProfile.reconstitute({
        id: mockId,
        userId: mockUserId,
        subRole: SubAdminRole.CUSTOMER_SUPPORT,
        createdAt: mockCreatedAt,
        updatedAt: new Date('2025-02-01'),
      });
      expect(reconstituted.subRole).toBe(SubAdminRole.CUSTOMER_SUPPORT);
      expect(reconstituted.updatedAt).toEqual(new Date('2025-02-01'));
    });
  });

  describe('behaviors', () => {
    it('should change sub-role', () => {
      adminProfile.changeSubRole(SubAdminRole.CUSTOMER_SUPPORT);
      expect(adminProfile.subRole).toBe(SubAdminRole.CUSTOMER_SUPPORT);
    });
  });
});
