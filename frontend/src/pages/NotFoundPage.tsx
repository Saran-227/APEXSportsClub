import React from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <EmptyState
      icon={<AlertCircle className="h-6 w-6 text-rose-500" />}
      title="Page Not Found"
      description="The requested sports club module or route does not exist."
      action={
        <Button variant="primary" size="sm" onClick={() => window.location.href = '/dashboard'}>
          Return to Dashboard
        </Button>
      }
    />
  </div>
);
