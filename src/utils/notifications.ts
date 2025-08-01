// src/utils/notifications.ts

import { toast, type TypeOptions, type ToastContent } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Severity,
  SystemNotification,
  FunctionalNotification,
  Operation,
  ToastOptions,
  NotificationMethods
} from '@/types/notification.types';
import { Operations } from '@/types/notification.types';

// Get the notification store
const getNotificationStore = () => useNotificationStore.getState();

// Default toast options
const defaultToastOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  pauseOnFocusLoss: true,
  closeButton: true,
  theme: 'light',
};

// Console methods mapping
const consoleMethods: Record<Severity, (...data: any[]) => void> = {
  critical: console.error,
  error: console.error,
  warning: console.warn,
  info: console.info,
  success: console.log,
  debug: console.debug,
};

// Helper for logging with severity
const logWithSeverity = (severity: Severity, message: string, context?: unknown) => {
  const logFn = consoleMethods[severity] || console.info;
  if (typeof logFn === 'function') {
    logFn(`[${severity.toUpperCase()}] ${message}`, context || '');
  }
};

// Map of toast methods by severity
const toastMethods = {
  info: toast.info,
  success: toast.success,
  warning: toast.warn,
  error: toast.error,
  critical: toast.error, // Use error style for critical
  debug: (content: ToastContent, options?: any) => {
    // For debug, log to console and optionally show in UI
    console.debug('[DEBUG]', content);
    if (options?.showInUI !== false) {
      toast(content, { ...options, type: 'default' });
    }
  },
} as const;

// Get toast function for severity
const getToastFn = (severity: Severity) => toastMethods[severity] || toast.info;

// Map our Severity to react-toastify's TypeOptions
function mapSeverityToType(severity: Severity): TypeOptions {
  const typeMap: Record<Severity, TypeOptions> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
    success: 'success',
    debug: 'default'
  };
  return typeMap[severity] || 'default';
}

// Create a system notification
const createSystemNotification = (
  config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'severity' | 'category'> & { 
    severity?: Severity;
    origin?: string;
  },
  severity: Severity = 'info'
): SystemNotification => {
  const finalSeverity = config.severity || severity;
  
  const notification: SystemNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'system',
    ...config,
    severity: finalSeverity,
    toastOptions: {
      ...defaultToastOptions,
      ...config.toastOptions,
      type: mapSeverityToType(finalSeverity),
      'data-notification-type': 'system',
    },
  };

  // Add to store
  const store = getNotificationStore();
  if (store.add) {
    store.add(notification);
  } else if (store.addNotification) {
    store.addNotification(notification);
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    logWithSeverity(notification.severity, notification.message, notification.context);
  }

  // Show toast if enabled
  if (notification.showInUI) {
    const toastFn = getToastFn(notification.severity);
    toastFn(notification.message, notification.toastOptions);
  }

  return notification;
};

// Create a functional notification
const createFunctionalNotification = (
  config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'severity' | 'category'> & { 
    severity?: Severity;
    entity: string;
    operation: Operation;
    origin?: string;
  },
  severity: Severity = 'info'
): FunctionalNotification => {
  const finalSeverity = config.severity || severity;
  
  const notification: FunctionalNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'functional',
    ...config,
    severity: finalSeverity,
    message: config.message,
    entity: config.entity,
    operation: config.operation,
    data: config.data,
    origin: config.origin || 'app',
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    toastOptions: {
      ...defaultToastOptions,
      ...config.toastOptions,
      type: mapSeverityToType(finalSeverity),
      'data-notification-type': 'functional',
      'data-entity': config.entity,
      'data-operation': config.operation,
    },
  };

  // Add to store
  const store = getNotificationStore();
  if (store.add) {
    store.add(notification);
  } else if (store.addNotification) {
    store.addNotification(notification);
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    logWithSeverity(
      notification.severity,
      `[${notification.operation}] ${notification.entity}: ${notification.message}`,
      {
        technicalDetails: notification.technicalDetails,
        data: notification.data,
      }
    );
  }

  // Show toast if enabled
  if (notification.showInUI) {
    const toastFn = getToastFn(notification.severity);
    toastFn(`${notification.entity}: ${notification.message}`, notification.toastOptions);
  }

  return notification;
};

// Operation-specific creators
const createOperationNotification = (
  operation: Operation,
  entity: string,
  message: string,
  options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> & { severity?: Severity } = {}
): FunctionalNotification => {
  // Default severity based on operation type
  const defaultSeverity: Record<Operation, Severity> = {
    create: 'success',
    read: 'info',
    update: 'warning',
    delete: 'error',
    sync: 'info',
    validate: 'info',
    process: 'info',
    login: 'info',
    logout: 'info',
    register: 'success',
    password_reset: 'info',
    access_grant: 'success',
    access_revoke: 'warning',
    email_verification: 'info',
    status_change: 'info'
  };

  return createFunctionalNotification(
    {
      ...options,
      entity,
      operation,
      message,
      severity: options.severity || defaultSeverity[operation] || 'info',
      origin: 'origin' in options ? options.origin : 'app',
    },
    options.severity || defaultSeverity[operation] || 'info'
  );
}
// Create notification methods object
const notification: NotificationMethods = {
  // System notifications
  system: (config) => {
    // Ensure required properties are provided
    if (!config.message) {
      throw new Error('System notification requires a message');
    }
    
    return createSystemNotification({
      ...config,
      severity: config.severity || 'info',
      origin: 'origin' in config ? config.origin : 'app',
    });
  },

  // Functional notifications
  functional: (config) => {
    // Ensure required properties are provided
    if (!config.entity || !config.operation || !config.message) {
      throw new Error('Functional notification requires entity, operation, and message');
    }
    
    return createFunctionalNotification({
      ...config,
      severity: config.severity || 'info',
      origin: 'origin' in config ? config.origin : 'app',
    });
  },

  // Severity-based shortcuts
  success: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'success',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  error: (message, error, options = { origin: 'app' }) => {
    const errorMessage = error instanceof Error ? error.message : String(error || message);
    return createSystemNotification({
      ...options,
      message: errorMessage,
      severity: 'error',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  warning: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'warning',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  info: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'info',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  critical: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'critical',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  debug: (message, options = { origin: 'app' }) => {
    // Log to console for debug messages
    console.debug('[DEBUG]', message);
    
    return createSystemNotification({
      ...options,
      message,
      severity: 'debug',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  // Operation shortcuts
  operation: {
    create: (entity, message, options = {}) => 
      createOperationNotification('create', entity, message, options),
      
    read: (entity, message, options = {}) => 
      createOperationNotification('read', entity, message, options),
      
    update: (entity, message, options = {}) => 
      createOperationNotification('update', entity, message, options),
      
    delete: (entity, message, options = {}) => 
      createOperationNotification('delete', entity, message, options),
      
    sync: (entity, message, options = {}) => 
      createOperationNotification('sync', entity, message, options),
      
    validate: (entity, message, options = {}) => 
      createOperationNotification('validate', entity, message, options),
      
    process: (entity, message, options = {}) => 
      createOperationNotification('process', entity, message, options),
  },

  // CRUD shortcuts
  created: (entity, message, data) => 
    createFunctionalNotification({
      entity,
      operation: 'create',
      message,
      data,
      severity: 'success',
      origin: 'app',
    }),

  updated: (entity, message, data) => 
    createFunctionalNotification({
      entity,
      operation: 'update',
      message,
      data,
      severity: 'info',
      origin: 'app',
    }),

  deleted: (entity, message, data) => 
    createFunctionalNotification({
      entity,
      operation: 'delete',
      message,
      data,
      severity: 'warning',
      origin: 'app',
    }),

  fetched: (entity, message, data) => 
    createFunctionalNotification({
      entity,
      operation: 'read',
      message,
      data,
      severity: 'info',
      origin: 'app',
    }),

  // Functional notifications
  functional: (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>) => {
    // Ensure required properties are provided
    if (!config.entity || !config.operation || !config.message) {
      throw new Error('Functional notification requires entity, operation, and message');
    }
    
    return createFunctionalNotification({
      ...config,
      severity: config.severity || 'info',
      origin: 'origin' in config ? config.origin : 'app',
    });
  },

  // Severity-based shortcuts
  success: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'success',
      origin: 'origin' in options ? options.origin : 'app',
    });
  },

  error: (message: string, error?: unknown, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    const errorMessage = error instanceof Error ? error.message : String(error || message);
    return createSystemNotification({
      ...options,
      message: errorMessage,
      severity: 'error',
      context: {
        ...('context' in options ? options.context : {}),
        error: error instanceof Error ? error : new Error(errorMessage),
      },
    });
  },

  warning: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'warning',
    });
  },

  info: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'info',
    });
  },

  critical: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'critical',
    });
  },

  debug: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'debug',
    });
  },
    
  // Operation shortcuts
  operation: {
    create: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('create', entity, message, options);
    },
    read: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('read', entity, message, options);
    },
    update: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('update', entity, message, options);
    },
    delete: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('delete', entity, message, options);
    },
    sync: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('sync', entity, message, options);
    },
    validate: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('validate', entity, message, options);
    },
    process: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
      return createOperationNotification('process', entity, message, options);
    },
  }
    // Ensure required properties are provided
    if (!config.message) {
      throw new Error('System notification requires a message');
    }
    
    return createSystemNotification({
      category: 'system',
      origin: config.origin || 'app',
      message: config.message,
      code: config.code,
      context: config.context,
      logToConsole: config.logToConsole,
      showInUI: config.showInUI,
      toastOptions: config.toastOptions,
      severity: config.severity
    }, config.severity || 'info');
  },
  
  functional: (config) => {
    // Ensure required properties are provided
    if (!config.entity || !config.operation || !config.message) {
      throw new Error('Functional notification requires entity, operation, and message');
    }
    
    return createFunctionalNotification({
      category: 'functional',
      entity: config.entity,
      operation: config.operation,
      message: config.message,
      technicalDetails: config.technicalDetails,
      data: config.data,
      logToConsole: config.logToConsole,
      showInUI: config.showInUI,
      toastOptions: config.toastOptions,
      severity: config.severity
    }, config.severity || 'info');
  },

  // Severity-based shortcuts
  info: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: true,
      origin: 'app' as const
    }, 'info'),
    
  success: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: true,
      origin: 'app' as const
    }, 'success'),
    
  warning: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: true,
      origin: 'app' as const
    }, 'warning'),
    
  error: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: true,
      origin: 'app' as const
    }, 'error'),
    
  critical: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: true,
      origin: 'app' as const
    }, 'critical'),
    
  debug: (message: string, options: Omit<SystemNotificationConfig, 'message' | 'severity' | 'category'> = {}) =>
    createSystemNotification({
      ...options,
      message,
      logToConsole: true,
      showInUI: false,
      origin: 'app' as const
    }, 'debug'),
  
  // Operation shortcuts
  operation: {
    create: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.CREATE, 
        message, 
        severity: 'success' as const
      }, 'success'),
      
    read: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.READ, 
        message, 
        severity: 'info' as const
      }, 'info'),
      
    update: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.UPDATE, 
        message, 
        severity: 'success' as const
      }, 'success'),
      
    delete: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.DELETE, 
        message, 
        severity: 'warning' as const
      }, 'warning'),
      
    sync: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.SYNC, 
        message, 
        severity: 'info' as const
      }, 'info'),
      
    validate: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.VALIDATE, 
        message, 
        severity: 'info' as const
      }, 'info'),
      
    process: (entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> = {}) =>
      createFunctionalNotification({ 
        ...options, 
        entity, 
        operation: Operations.PROCESS, 
        message, 
        severity: 'info' as const
      }, 'info'),
  }

return createFunctionalNotification({
...config,
severity: 'severity' in config ? config.severity : 'info',
});
},

// Severity-based shortcuts
success: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
return createSystemNotification({
...options,
message,
severity: 'success',
});
},

error: (message: string, error?: unknown, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
const errorMessage = error instanceof Error ? error.message : String(error || message);
return createSystemNotification({
...options,
message: errorMessage,
severity: 'error',
context: {
...('context' in options ? options.context : {}),
error: error instanceof Error ? error : new Error(errorMessage),
},
});
},

warning: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
return createSystemNotification({
...options,
message,
severity: 'warning',
});
},

info: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
return createSystemNotification({
...options,
message,
severity: 'info',
});
},

critical: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
return createSystemNotification({
...options,
message,
severity: 'critical',
});
},

debug: (message: string, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
return createSystemNotification({
...options,
message,
severity: 'debug',
});
},

// Operation shortcuts
operation: {
create: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('create', entity, message, options);
},
read: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('read', entity, message, options);
},
update: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('update', entity, message, options);
},
delete: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('delete', entity, message, options);
},
sync: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('sync', entity, message, options);
},
validate: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('validate', entity, message, options);
},
process: (entity: string, message: string, options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'entity' | 'operation' | 'message' | 'severity'> = {}) => {
return createOperationNotification('process', entity, message, options);
},
},
};

// Export the notification object as the default export
export default notification;

// Re-export types for convenience
export type {
  Severity,
  SystemNotification,
  FunctionalNotification,
  Operation,
  SystemNotificationConfig,
  FunctionalNotificationConfig,
  ToastOptions,
  NotificationMethods
} from '@/types/notification.types';
