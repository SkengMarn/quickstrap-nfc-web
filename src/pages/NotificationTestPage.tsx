import React from 'react';
import { Button, Card, CardBody, CardHeader, Container, Row, Col } from 'react-bootstrap';
import notification from '../utils/notifications';

export default function NotificationTestPage() {
  const testSystemNotification = () => {
    // Use the operation method for system notifications with context
    notification.operation({
      entity: 'system',
      operation: 'notify',
      message: 'This is a system notification',
      technicalDetails: 'System notification test',
      data: { test: 'system' },
      toastOptions: { autoClose: 3000 }
    });
  };

  const testSuccessNotification = () => {
    notification.operation({
      entity: 'test',
      operation: 'create',
      message: 'Operation completed successfully',
      technicalDetails: 'Success notification test',
      data: { test: 'success' },
      toastOptions: { autoClose: 3000 }
    });
  };

  const testErrorNotification = () => {
    try {
      // Simulate an error
      throw new Error('This is a test error');
    } catch (error) {
      notification.operation({
        entity: 'test',
        operation: 'error',
        message: 'An error occurred',
        technicalDetails: error instanceof Error ? error.message : 'Unknown error',
        data: { test: 'error' },
        toastOptions: { autoClose: 5000 }
      });
    }
  };

  const testWarningNotification = () => {
    notification.operation({
      entity: 'test',
      operation: 'warning',
      message: 'This is a warning',
      technicalDetails: 'Warning notification test',
      data: { test: 'warning' },
      toastOptions: { autoClose: 4000 }
    });
  };

  const testFunctionalNotification = () => {
    notification.functional({
      entity: 'test',
      operation: 'create',
      message: 'Test item created',
      technicalDetails: 'Additional details about the operation',
      data: { id: '123', name: 'Test Item' },
      config: {
        logToConsole: true,
        showInUI: true,
        message: 'Test item created',
        category: 'functional',
        context: { test: 'functional' },
        toastOptions: { autoClose: 4500 }
      }
    });
  };

  const testCrudNotifications = () => {
    notification.created('test', 'Test item was created', { id: '123' });
    notification.updated('test', 'Test item was updated', { id: '123' });
    notification.deleted('test', 'Test item was deleted', { id: '123' });
    notification.fetched('test', 'Test items were fetched', { count: 5 });
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
