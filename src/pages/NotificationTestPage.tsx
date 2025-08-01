import React from 'react';
import { Button, Card, CardBody, CardHeader, Container, Row, Col } from 'react-bootstrap';
import notification from '../utils/notifications';

export default function NotificationTestPage() {
  const testSystemNotification = () => {
    notification.info('This is a system notification', {
      entity: 'system',
      operation: 'test',
      severity: 'info',
      technicalDetails: 'System notification test',
      context: { 
        test: 'system',
        origin: 'test',
        code: 'SYSTEM_NOTIFICATION'
      },
      toastOptions: {
        autoClose: 3000
      }
    });
  };

  const testSuccessNotification = () => {
    notification.success('Operation completed successfully', {
      entity: 'test',
      operation: 'create',
      severity: 'success',
      technicalDetails: 'Success notification test',
      context: { 
        test: 'success' 
      },
      toastOptions: {
        autoClose: 3000
      }
    });
  };

  const testErrorNotification = () => {
    try {
      // Simulate an error
      throw new Error('This is a test error');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      notification.error('An error occurred', error, {
        entity: 'test',
        operation: 'delete',
        severity: 'error',
        technicalDetails: errorMessage,
        context: { 
          error: error instanceof Error ? error.stack : String(error),
          test: 'error'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
    }
  };

  const testWarningNotification = () => {
    notification.warning('This is a warning', {
      entity: 'test',
      operation: 'update',
      severity: 'warning',
      technicalDetails: 'Warning notification test',
      context: { 
        test: 'warning' 
      },
      toastOptions: {
        autoClose: 4000
      }
    });
  };

  const testFunctionalNotification = () => {
    notification.info('Test item created', {
      entity: 'test',
      operation: 'create',
      severity: 'info',
      technicalDetails: 'Additional details about the operation',
      context: { 
        test: 'functional',
        data: { id: '123', name: 'Test Item' }
      },
      toastOptions: {
        autoClose: 4500
      }
    });
  };

  const testCrudNotifications = () => {
    // CRUD helpers with proper typing
    notification.success('Test item was created', {
      entity: 'Test Item',
      operation: 'create',
      severity: 'success',
      context: { id: '123' }
    });
    notification.success('Test item was updated', {
      entity: 'Test Item',
      operation: 'update',
      severity: 'success',
      context: { id: '123' }
    });
    notification.success('Test item was deleted', {
      entity: 'Test Item',
      operation: 'delete',
      severity: 'success',
      context: { id: '123' }
    });
    notification.success('Test items were fetched', {
      entity: 'Test Items',
      operation: 'read',
      severity: 'info',
      context: { count: 5 }
    });
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Notification System Test</h1>
      <Row className="g-4">
        <Col md={6} lg={4}>
          <Card>
            <CardHeader>System Notifications</CardHeader>
            <CardBody>
              <Button 
                variant="outline-primary" 
                className="w-100 mb-2"
                onClick={testSystemNotification}
              >
                Test System Notification
              </Button>
              <Button 
                variant="outline-success" 
                className="w-100 mb-2"
                onClick={testSuccessNotification}
              >
                Test Success Notification
              </Button>
              <Button 
                variant="outline-danger" 
                className="w-100 mb-2"
                onClick={testErrorNotification}
              >
                Test Error Notification
              </Button>
              <Button 
                variant="outline-warning" 
                className="w-100"
                onClick={testWarningNotification}
              >
                Test Warning Notification
              </Button>
            </CardBody>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card>
            <CardHeader>Functional Notifications</CardHeader>
            <CardBody>
              <Button 
                variant="outline-info" 
                className="w-100 mb-3"
                onClick={testFunctionalNotification}
              >
                Test Functional Notification
              </Button>
              <Button 
                variant="outline-secondary" 
                className="w-100"
                onClick={testCrudNotifications}
              >
                Test CRUD Notifications
              </Button>
            </CardBody>
          </Card>
        </Col>
        <Col md={12} lg={4}>
          <Card>
            <CardHeader>Notification Center</CardHeader>
            <CardBody>
              <p className="text-muted">
                Check the notification center (bell icon) to see all notifications.
                Notifications will also appear as toasts at the top-right of the screen.
              </p>
              <p className="text-muted">
                <strong>Note:</strong> System notifications with severity 'debug' will only appear in the console.
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
