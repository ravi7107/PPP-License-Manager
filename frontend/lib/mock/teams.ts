import { Team } from '@/lib/types/domain';

export const teams: Team[] = [
  { id: 't1', name: 'Structural Engineering', leader: 'Sarah Johnson' },
  { id: 't2', name: 'MEP Design', leader: 'Michael Chen' },
  { id: 't3', name: 'Architecture', leader: 'Priya Patel' },
  { id: 't4', name: 'BIM Coordination', leader: 'David Okafor' },
];

// The team the logged-in Team Leader manages, resolved by matching user's name/email to a team leader.
// In this mock setup we default to the first team when no explicit match is found.
export function resolveUserTeam(userName: string | undefined): Team {
  const match = teams.find((t) => t.leader.toLowerCase() === (userName ?? '').toLowerCase());
  return match ?? teams[0];
}
