import {
  LayoutDashboard,
  HardDrive,
  KeySquare,
  Share2,
  ClipboardCheck,
  BarChart3,
  FileText,
  UserX,
  Search,
  Crown,
  Users,
  Building,
  Landmark,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { ModuleKey } from '@/lib/auth/roles';

export interface NavItem {
  key: ModuleKey;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { key: 'executive', label: 'Executive Dashboard', path: '/executive', icon: Crown },
  { key: 'hardware', label: 'Hardware Assets', path: '/hardware', icon: HardDrive },
  { key: 'licenses', label: 'Software Licenses', path: '/licenses', icon: KeySquare },
  { key: 'allocations', label: 'Allocations', path: '/allocations', icon: Share2 },
  { key: 'availability', label: 'Resource Availability', path: '/availability', icon: UserX },
  { key: 'approvals', label: 'Approvals', path: '/approvals', icon: ClipboardCheck },
  { key: 'myRequests', label: 'My Requests', path: '/my-requests', icon: FileText },
  { key: 'users', label: 'Users', path: '/users', icon: Users },
  { key: 'departments', label: 'Departments', path: '/departments', icon: Building },
  { key: 'entities', label: 'Entities', path: '/entities', icon: Landmark },
  { key: 'clients', label: 'Clients', path: '/clients', icon: Briefcase },
  { key: 'accessManagement', label: 'Access Management', path: '/access-management', icon: ShieldCheck },
  { key: 'search', label: 'Global Search', path: '/search', icon: Search },
  { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
];
