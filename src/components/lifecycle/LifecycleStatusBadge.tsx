import React from 'react';
import { LifecycleStatus } from '../../types/phase1';
import lifecycleService from '../../services/lifecycleService';

interface LifecycleStatusBadgeProps {
  status: LifecycleStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LifecycleStatusBadge: React.FC<LifecycleStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md'
}) => {
  const badge = lifecycleService.getStatusBadge(status);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${sizeClasses[size]} ${colorClasses[badge.color] || colorClasses.gray}`}
    >
      {showIcon && <span>{badge.icon}</span>}
      {badge.label}
    </span>
  );
};

export default LifecycleStatusBadge;
