import type { SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User } from '../types';

interface ProfileRow {
  id: string;
  display_name: string;
  color: string;
  created_at: string;
}

interface MembershipRow {
  household_id: string;
  user_id: string;
}

interface HouseholdRow {
  id: string;
  name: string;
  invite_code: string;
}

export interface AccountSnapshot {
  user: User;
  partner: User | null;
}

const throwIfError = (error: { message?: string } | null, fallback: string) => {
  if (error) throw new Error(error.message || fallback);
};

export const loadAccountSnapshot = async (
  client: SupabaseClient,
  authUser: SupabaseAuthUser,
): Promise<AccountSnapshot> => {
  const [profileResult, membershipResult] = await Promise.all([
    client
      .from('profiles')
      .select('id, display_name, color, created_at')
      .eq('id', authUser.id)
      .single(),
    client
      .from('household_members')
      .select('household_id, user_id')
      .eq('user_id', authUser.id)
      .single(),
  ]);

  throwIfError(profileResult.error, 'Could not load your profile');
  throwIfError(membershipResult.error, 'Could not load your household');

  const profile = profileResult.data as ProfileRow | null;
  const membership = membershipResult.data as MembershipRow | null;
  if (!profile || !membership) {
    throw new Error('Your account setup is incomplete. Please sign out and try again.');
  }

  const [householdResult, membersResult] = await Promise.all([
    client
      .from('households')
      .select('id, name, invite_code')
      .eq('id', membership.household_id)
      .single(),
    client
      .from('household_members')
      .select('household_id, user_id')
      .eq('household_id', membership.household_id),
  ]);

  throwIfError(householdResult.error, 'Could not load your household');
  throwIfError(membersResult.error, 'Could not load household members');

  const household = householdResult.data as HouseholdRow | null;
  const members = (membersResult.data ?? []) as MembershipRow[];
  if (!household) throw new Error('Your household could not be found.');

  const memberIds = members.map(member => member.user_id);
  const profilesResult = await client
    .from('profiles')
    .select('id, display_name, color, created_at')
    .in('id', memberIds);
  throwIfError(profilesResult.error, 'Could not load household profiles');

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const partnerProfile = profiles.find(item => item.id !== authUser.id) ?? null;

  const shared = {
    householdId: household.id,
    householdName: household.name,
    inviteCode: household.invite_code,
  };

  const partner: User | null = partnerProfile
    ? {
        id: partnerProfile.id,
        name: partnerProfile.display_name,
        color: partnerProfile.color,
        createdAt: partnerProfile.created_at,
        ...shared,
      }
    : null;

  const user: User = {
    id: profile.id,
    name: profile.display_name,
    email: authUser.email,
    color: profile.color,
    createdAt: profile.created_at || authUser.created_at,
    partnerId: partner?.id,
    ...shared,
  };

  return { user, partner };
};

export const joinHousehold = async (
  client: SupabaseClient,
  inviteCode: string,
): Promise<void> => {
  const { error } = await client.rpc('join_household_by_code', {
    requested_code: inviteCode.trim().toUpperCase(),
  });
  throwIfError(error, 'Could not connect your household');
};

export const leaveHousehold = async (client: SupabaseClient): Promise<void> => {
  const { error } = await client.rpc('leave_household');
  throwIfError(error, 'Could not leave the household');
};

export const updateProfile = async (
  client: SupabaseClient,
  userId: string,
  updates: Pick<Partial<User>, 'name' | 'color'>,
): Promise<void> => {
  const row: Record<string, string> = {};
  if (typeof updates.name === 'string') row.display_name = updates.name.trim();
  if (typeof updates.color === 'string') row.color = updates.color;
  if (!Object.keys(row).length) return;

  const { error } = await client.from('profiles').update(row).eq('id', userId);
  throwIfError(error, 'Could not update your profile');
};
