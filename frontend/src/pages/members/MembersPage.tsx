import React, { useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Member } from '../../types';

export const MembersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Demonstration member dataset aligned strictly to Champions Club (Gold, Silver, Junior)
  const demoMembers: Member[] = [
    {
      id: 'mem_01',
      membershipNumber: 'CC-1021',
      firstName: 'Alexander',
      lastName: 'Vance',
      email: 'alex.vance@example.com',
      phone: '+1 (555) 234-5678',
      status: 'ACTIVE',
      tier: 'GOLD',
      joinDate: '2025-01-15',
      expiryDate: '2026-01-14',
    },
    {
      id: 'mem_02',
      membershipNumber: 'CC-1022',
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.r@example.com',
      phone: '+1 (555) 987-6543',
      status: 'ACTIVE',
      tier: 'GOLD',
      joinDate: '2025-03-20',
      expiryDate: '2026-03-19',
    },
    {
      id: 'mem_03',
      membershipNumber: 'CC-1023',
      firstName: 'Marcus',
      lastName: 'Sterling',
      email: 'marcus.s@example.com',
      phone: '+1 (555) 443-8821',
      status: 'SUSPENDED',
      tier: 'SILVER',
      joinDate: '2024-11-01',
      expiryDate: '2025-11-01',
    },
    {
      id: 'mem_04',
      membershipNumber: 'CC-1024',
      firstName: 'Sophia',
      lastName: 'Chen',
      email: 'sophia.c@example.com',
      phone: '+1 (555) 678-9012',
      status: 'ACTIVE',
      tier: 'SILVER',
      joinDate: '2024-06-10',
      expiryDate: '2026-06-09',
    },
    {
      id: 'mem_05',
      membershipNumber: 'CC-1025',
      firstName: 'Leo',
      lastName: 'Aris',
      email: 'leo.aris@example.com',
      phone: '+1 (555) 321-4567',
      status: 'ACTIVE',
      tier: 'JUNIOR',
      joinDate: '2025-05-01',
      expiryDate: '2026-05-01',
    },
  ];

  const filtered = demoMembers.filter((m) => {
    const matchesSearch =
      m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.membershipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchesTier = tierFilter === 'ALL' || m.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Champions Club Members Directory"
        description="Search, enroll, and manage athletic memberships across Gold, Silver, and Junior tiers."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => alert('Member registration form will connect to POST /api/v1/members.')}
          >
            Register Member
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="Members Module" />

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by name, email, or #CC ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter members by tier"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Tiers (Gold, Silver, Junior)</option>
              <option value="GOLD">Gold Tier</option>
              <option value="SILVER">Silver Tier</option>
              <option value="JUNIOR">Junior Tier</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter members by status"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Member Info</th>
                <th className="py-3.5 px-4">Membership #</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Valid Through</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                        {member.firstName.charAt(0)}
                        {member.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {member.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {member.membershipNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-medium text-slate-800">
                      <Shield className={`h-3.5 w-3.5 ${
                        member.tier === 'GOLD' ? 'text-amber-500' : member.tier === 'SILVER' ? 'text-slate-400' : 'text-emerald-500'
                      }`} />
                      <span>{member.tier}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {member.status === 'ACTIVE' && (
                      <Badge variant="success" size="sm">Active</Badge>
                    )}
                    {member.status === 'SUSPENDED' && (
                      <Badge variant="warning" size="sm">Suspended</Badge>
                    )}
                    {member.status === 'EXPIRED' && (
                      <Badge variant="danger" size="sm">Expired</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{member.expiryDate}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Detail profile for ${member.firstName} (${member.id}) will query GET /api/v1/members/${member.id}.`)}
                      type="button"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer text-xs"
                    >
                      <span>Manage</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/members</code> • <code className="text-slate-600 font-mono">POST /api/v1/members</code>
      </div>
    </div>
  );
};
