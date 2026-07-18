export interface EntityRecord {
  id: string;
  name: string;
}

export interface ClientRecord {
  id: string;
  name: string;
}

export const entities: EntityRecord[] = [
  { id: 'e1', name: 'PPS HQ' },
  { id: 'e2', name: 'PPS North Branch' },
  { id: 'e3', name: 'PPS West Branch' },
];

export const clients: ClientRecord[] = [
  { id: 'c1', name: 'Meridian Infrastructure' },
  { id: 'c2', name: 'Horizon Developers' },
  { id: 'c3', name: 'Coastal Energy Corp' },
  { id: 'c4', name: 'Internal / Overhead' },
];

// Software cost allocation by entity (annual license spend), mock breakdown.
export const costByEntity = [
  { entity: 'PPS HQ', cost: 98500 },
  { entity: 'PPS North Branch', cost: 52300 },
  { entity: 'PPS West Branch', cost: 41200 },
];

// Software cost allocation by client project (annual license spend), mock breakdown.
export const costByClient = [
  { client: 'Meridian Infrastructure', cost: 64500 },
  { client: 'Horizon Developers', cost: 48200 },
  { client: 'Coastal Energy Corp', cost: 39800 },
  { client: 'Internal / Overhead', cost: 39500 },
];
