import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Employee, Shift } from '../../types';

export const EmployeesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'ROSTER'>('STAFF');

  const demoEmployees: Employee[] = [
    { id: 'emp_1', fullName: 'Carlos Silva', role: 'Head Tennis Coach', department: 'ATHLETICS', email: 'carlos.s@championsclub.com', phone: '+1 (555) 303-9911', employmentStatus: 'ACTIVE' },
    { id: 'emp_2', fullName: 'Vikram Nair', role: 'Head Cricket Coach', department: 'ATHLETICS', email: 'vikram.n@championsclub.com', phone: '+1 (555) 303-9915', employmentStatus: 'ACTIVE' },
    { id: 'emp_3', fullName: 'Rachel Vance', role: 'Front Desk Lead', department: 'OPERATIONS', email: 'rachel.v@championsclub.com', phone: '+1 (555) 303-9912', employmentStatus: 'ACTIVE' },
    { id: 'emp_4', fullName: 'Mateo Rossi', role: 'Pavilion Chef & Barista', department: 'FOOD_AND_BEV', email: 'mateo.r@championsclub.com', phone: '+1 (555) 303-9913', employmentStatus: 'ACTIVE' },
  ];

  const demoShifts: Shift[] = [
    { shiftId: 'sh_1', employeeName: 'Carlos Silva', facility: 'Tennis Courts (Clay & Hard)', startTime: '08:00 AM', endTime: '04:00 PM', status: 'IN_PROGRESS' },
    { shiftId: 'sh_2', employeeName: 'Vikram Nair', facility: 'Cricket Pitch & Practice Nets', startTime: '09:00 AM', endTime: '05:00 PM', status: 'SCHEDULED' },
    { shiftId: 'sh_3', employeeName: 'Rachel Vance', facility: 'Front Reception Desk', startTime: '07:30 AM', endTime: '03:30 PM', status: 'IN_PROGRESS' },
    { shiftId: 'sh_4', employeeName: 'Mateo Rossi', facility: 'Pavilion Cafeteria & Bar', startTime: '10:00 AM', endTime: '06:00 PM', status: 'SCHEDULED' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Human Resources"
        description="Employee profiles, coaches scheduling, facility shift assignments, and leave approvals."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Calendar className="h-4 w-4" />}
              onClick={() => alert('Leave request modal will connect to POST /api/v1/employees/leave-requests.')}
            >
              Request Leave
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => alert('Employee onboarding will connect to FastAPI HR endpoints.')}
            >
              Add Staff Member
            </Button>
          </div>
        }
      />

      <PlaceholderNoticeBanner moduleName="Staff & HR Module" />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'STAFF' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Staff Directory ({demoEmployees.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ROSTER')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition ${
            activeTab === 'ROSTER' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Facility Shift Roster</span>
        </button>
      </div>

      {activeTab === 'STAFF' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoEmployees.map((emp) => (
            <Card key={emp.id} className="p-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 text-sm border border-slate-200">
                {emp.fullName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{emp.fullName}</h3>
                  {emp.employmentStatus === 'ACTIVE' ? (
                    <Badge variant="success" size="sm">Active</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">On Leave</Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">{emp.role}</p>
                <span className="inline-block mt-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {emp.department}
                </span>

                <div className="mt-3 space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{emp.phone}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daily Shift Roster - Today</CardTitle>
            <Badge variant="neutral" size="sm">Week 47</Badge>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {demoShifts.map((shift) => (
              <div key={shift.shiftId} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{shift.employeeName}</p>
                  <p className="text-slate-500">{shift.facility}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{shift.startTime} - {shift.endTime}</p>
                  <span className="text-[11px] font-medium text-emerald-600">{shift.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/employees</code> • <code className="text-slate-600 font-mono">GET /api/v1/employees/shifts</code>
      </div>
    </div>
  );
};
