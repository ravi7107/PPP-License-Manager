export interface DepartmentRecord {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: string;
  user_count: number;
}

export interface EntityRecord {
  id: number;
  name: string;
  code: string;
  address: string | null;
  status: string;
  asset_count: number;
}

export interface ClientRecord {
  id: number;
  name: string;
  code: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  asset_count: number;
}

export interface DirectoryUserRecord {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_team_leader: boolean;
  status: string;
  department_id: number | null;
  department_name: string | null;
  entity_id: number | null;
  entity_name: string | null;
}
