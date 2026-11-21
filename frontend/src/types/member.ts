export type MembershipTier = 'GOLD' | 'SILVER' | 'JUNIOR';
export type MemberStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'PENDING';

export interface Member {
  id: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: MemberStatus;
  tier: MembershipTier;
  joinDate: string;
  expiryDate: string;
  avatarUrl?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  tier: MembershipTier;
  durationMonths: number;
  price: number;
  courtAccess: string[];
  isActive: boolean;
}
