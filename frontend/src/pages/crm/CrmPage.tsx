import React, { useState } from 'react';
import {
  MessageSquareText,
  Plus,
  Mail,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PlaceholderNoticeBanner } from '../../components/common/PlaceholderNoticeBanner';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { Enquiry } from '../../types';

export const CrmPage: React.FC = () => {
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const demoEnquiries: Enquiry[] = [
    {
      id: 'enq_1',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      phone: '+1 (555) 789-1029',
      interest: 'Junior Tennis Academy & Gold Family Plan',
      source: 'Website Contact Form',
      status: 'NEW',
      createdAt: 'Today, 09:15 AM',
      notes: 'Interested in weekend junior coaching for two children.',
    },
    {
      id: 'enq_2',
      name: 'Jordan Bell',
      email: 'jordan.b@example.com',
      phone: '+1 (555) 674-1188',
      interest: 'Weekend Cricket League & Turf Pitch Booking',
      source: 'Walk-in Inquiry',
      status: 'TOUR_SCHEDULED',
      createdAt: 'Yesterday, 04:30 PM',
      notes: 'Tour scheduled for Saturday 11am with Cricket Coach Vikram.',
    },
    {
      id: 'enq_3',
      name: 'Natalie Wong',
      email: 'natalie.w@example.com',
      phone: '+1 (555) 341-9900',
      interest: 'Corporate Sports Package (Tennis & Cricket)',
      source: 'Phone Inquiry',
      status: 'CONTACTED',
      createdAt: 'Nov 19, 2026',
      notes: 'Requested corporate package for 15 employee memberships.',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM & Prospect Enquiries"
        description="Track prospective club member leads, arrange facility tours, and log follow-up sales discussions."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => alert('New lead modal will connect to POST /api/v1/enquiries.')}
          >
            New Lead
          </Button>
        }
      />

      <PlaceholderNoticeBanner moduleName="CRM & Member Enquiries Module" />

      {/* Leads list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {demoEnquiries.map((enq) => (
          <Card key={enq.id} className="flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{enq.name}</h3>
                  <span className="text-[11px] text-slate-500">{enq.createdAt}</span>
                </div>
                {enq.status === 'NEW' && <Badge variant="warning" size="sm">New Lead</Badge>}
                {enq.status === 'TOUR_SCHEDULED' && <Badge variant="info" size="sm">Tour Booked</Badge>}
                {enq.status === 'CONTACTED' && <Badge variant="neutral" size="sm">Contacted</Badge>}
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                <span className="font-semibold text-emerald-700 block mb-0.5">Primary Interest:</span>
                <p className="font-medium text-slate-900">{enq.interest}</p>
                <p className="mt-1 text-slate-500 text-[11px] italic">"{enq.notes}"</p>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{enq.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{enq.phone}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-mono">{enq.source}</span>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(enq)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Follow Up</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {selectedEnquiry && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-700" />
            <span>
              Follow-up for <strong>{selectedEnquiry.name}</strong> will connect to{' '}
              <code className="font-mono text-emerald-950">POST /api/v1/enquiries/{selectedEnquiry.id}/follow-ups</code>
            </span>
          </div>
          <button
            onClick={() => setSelectedEnquiry(null)}
            className="font-bold underline cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 pt-2">
        Contract Endpoint Reference: <code className="text-slate-600 font-mono">GET /api/v1/enquiries</code> • <code className="text-slate-600 font-mono">POST /api/v1/enquiries</code>
      </div>
    </div>
  );
};
