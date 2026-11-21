import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard Overview',
  members: 'Members Directory',
  bookings: 'Court & Pitch Reservations',
  inventory: 'Equipment & Inventory',
  shop: 'Pro Shop (POS)',
  cafeteria: 'Bar & Cafeteria',
  finance: 'Financial Reports',
  employees: 'Staff & HR Roster',
  crm: 'CRM & Member Enquiries',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-slate-800 transition"
      >
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span>Champions Club</span>
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="mx-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800">{label}</span>
            ) : (
              <Link to={routeTo} className="hover:text-slate-800 transition">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
