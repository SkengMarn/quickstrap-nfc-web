import { Button, Card, CardBody, CardHeader, Container, Row, Col } from 'react-bootstrap';
import notification from '../utils/notifications';

export default function NotificationTestPage() {
  const testSystemNotification = () => {
    notification.info('This is a system notification', {
      origin: 'test',
      context: { 
        entity: 'system',
        operation: 'test',
        test: 'system',
        code: 'SYSTEM_NOTIFICATION',
        technicalDetails: 'System notification test'
      },
      toastOptions: {
        autoClose: 3000
      }
    });
  };

  const testSuccessNotification = () => {
    notification.success('Operation completed successfully', {
      origin: 'test',
      context: { 
        entity: 'test',
        operation: 'create',
        test: 'success',
        technicalDetails: 'Success notification test'
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
        origin: 'test',
        context: { 
          entity: 'test',
          operation: 'delete',
          error: error instanceof Error ? error.stack : String(error),
          test: 'error',
          technicalDetails: errorMessage
        },
        toastOptions: {
          autoClose: 5000
        }
      });
    }
  };

  const testWarningNotification = () => {
    notification.warning('This is a warning', {
      origin: 'test',
      context: { 
        entity: 'test',
        operation: 'update',
        test: 'warning',
        technicalDetails: 'Warning notification test'
      },
      toastOptions: {
        autoClose: 4000
      }
    });
  };

  const testFunctionalNotification = () => {
    notification.info('Test item created', {
      origin: 'test',
      context: { 
        entity: 'test',
        operation: 'create',
        test: 'functional',
        technicalDetails: 'Additional details about the operation',
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
      origin: 'test',
      context: { 
        entity: 'Test Item',
        operation: 'create',
        id: '123'
      }
    });
    notification.success('Test item was updated', {
      origin: 'test',
      context: { 
        entity: 'Test Item',
        operation: 'update',
        id: '123'
      }
    });
    notification.success('Test item was deleted', {
      origin: 'test',
      context: { 
        entity: 'Test Item',
        operation: 'delete',
        id: '123'
      }
    });
    notification.success('Test items were fetched', {
      origin: 'test',
      context: { 
        entity: 'Test Items',
        operation: 'read',
        count: 5
      }
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
