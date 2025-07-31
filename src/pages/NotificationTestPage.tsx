import React from 'react';
import { Button, Card, CardBody, CardHeader, Container, Row, Col } from 'react-bootstrap';
import notification from '../utils/notifications';

export default function NotificationTestPage() {
  const testSystemNotification = () => {
    notification.system({
      message: 'This is a system notification',
      severity: 'info',
      origin: 'test',
      code: 'SYSTEM_NOTIFICATION',
      context: { details: 'System notification test', test: 'system' },
      toastOptions: { autoClose: 3000 }
    });
  };

  const testSuccessNotification = () => {
    notification.operation(
      'create',
      'test',
      'Operation completed successfully',
      {
        severity: 'info',
        context: { 
          details: 'Success notification test',
          test: 'success' 
        },
        toastOptions: { autoClose: 3000 }
      }
    );
  };

  const testErrorNotification = () => {
    try {
      // Simulate an error
      throw new Error('This is a test error');
    } catch (error) {
      notification.operation(
        'delete', // Using 'delete' as a valid operation type
        'test',
        'An error occurred',
        {
          severity: 'error',
          context: { 
            details: error instanceof Error ? error.message : 'Unknown error',
            error: error instanceof Error ? error.stack : String(error),
            test: 'error'
          },
          toastOptions: { autoClose: 5000 }
        }
      );
    }
  };

  const testWarningNotification = () => {
    notification.operation(
      'update', // Using 'update' as a valid operation type
      'test',
      'This is a warning',
      {
        severity: 'warning',
        context: { 
          details: 'Warning notification test',
          test: 'warning' 
        },
        toastOptions: { autoClose: 4000 }
      }
    );
  };

  const testFunctionalNotification = () => {
    notification.operation(
      'create',
      'test',
      'Test item created',
      {
        severity: 'info',
        context: { 
          details: 'Additional details about the operation',
          test: 'functional' 
        },
        data: { id: '123', name: 'Test Item' },
        toastOptions: { autoClose: 4500 }
      }
    );
  };

  const testCrudNotifications = () => {
    // CRUD helpers with proper typing
    notification.created('Test Item', 'Test item was created', { id: '123' });
    notification.updated('Test Item', 'Test item was updated', { id: '123' });
    notification.deleted('Test Item', 'Test item was deleted', { id: '123' });
    notification.fetched('Test Items', 'Test items were fetched', { count: 5 });
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
