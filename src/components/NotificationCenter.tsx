import React, { useState, useRef, useEffect } from 'react';
import { X, Bell, Clock, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification, SystemNotification, FunctionalNotification } from '@/types/notification.types';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (notification: Notification) => {
    const className = 'w-5 h-5 mr-2';
    
    if (notification.category === 'system') {
      const systemNotif = notification as SystemNotification;
      switch (systemNotif.severity) {
        case 'error':
        case 'critical':
          return <XCircle className={`${className} text-red-500`} />;
        case 'warning':
          return <AlertCircle className={`${className} text-yellow-500`} />;
        case 'info':
        case 'debug':
        default:
          return <Info className={`${className} text-blue-500`} />;
      }
    } else {
      // For functional notifications
      return <CheckCircle className={`${className} text-green-500`} />;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.category === 'system') {
      const systemNotif = notification as SystemNotification;
      return `System ${systemNotif.severity}`;
    } else {
      const funcNotif = notification as FunctionalNotification;
      return funcNotif.entity.charAt(0).toUpperCase() + funcNotif.entity.slice(1);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                disabled={notifications.length === 0}
              >
                Mark all as read
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getNotificationTitle(notification)}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {notification.category === 'system'
                            ? typeof notification.context === 'object' && notification.context !== null
                              ? (notification.context as { message?: string })?.message || 'System notification'
                              : 'System notification'
                            : notification.message}
                        </p>
                        {notification.category === 'functional' && (notification as FunctionalNotification).technicalDetails && (
                          <details className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <summary className="cursor-pointer">Details</summary>
                            <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto max-h-32">
                              {(notification as FunctionalNotification).technicalDetails}
                            </pre>
                          </details>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
