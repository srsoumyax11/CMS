import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { RoleElevationWidget } from '@/components/RoleElevationWidget';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { LayoutDashboard } from 'lucide-react';

export function UserDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        title={`Welcome to CampusOne, ${user.name?.split(' ')[0] || 'User'}`}
        description="Your account is active. Please select your official campus role below to submit a verification request."
        icon={LayoutDashboard}
      />

      {/* Role Elevation Widget */}
      <RoleElevationWidget />
    </div>
  );
}
