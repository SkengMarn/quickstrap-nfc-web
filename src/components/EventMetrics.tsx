import { useUser } from '@supabase/auth-helpers-react';
import { Card, Row, Col, ProgressBar, Badge } from 'react-bootstrap';
import { supabase } from '../services/supabase';
import { useEffect, useState } from 'react';

type EventMetrics = {
  total_events: number;
  upcoming_events: number;
  active_events: number;
  avg_capacity: number;
};

type EventCheckinStats = {
  event_id: string;
  event_name: string;
  total_capacity: number;
  checked_in: number;
  checkin_percentage: number;
};

export const EventMetrics = () => {
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [stats, setStats] = useState<EventCheckinStats[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useUser();

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch event summary metrics
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('get_event_metrics');
          
        if (metricsError) throw metricsError;
        setMetrics(metricsData as EventMetrics);

        // Fetch check-in statistics
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_event_checkin_stats')
          .order('checkin_percentage', { ascending: false });
          
        if (statsError) throw statsError;
        setStats((statsData as EventCheckinStats[]) || []);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return <div>Loading metrics...</div>;
  }

  const getVariant = (percentage: number) => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'info';
    if (percentage >= 25) return 'warning';
    return 'danger';
  };

  return (
    <div className="mb-4">
      <h4 className="mb-3">Event Dashboard</h4>
      
      {/* Summary Cards */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-muted small mb-1">Total Events</Card.Title>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0">{metrics?.total_events || 0}</h2>
                <div className="bg-primary bg-opacity-10 p-2 rounded">
                  <i className="bi bi-calendar-event text-primary"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-muted small mb-1">Upcoming Events</Card.Title>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0">{metrics?.upcoming_events || 0}</h2>
                <div className="bg-success bg-opacity-10 p-2 rounded">
                  <i className="bi bi-arrow-up-circle text-success"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-muted small mb-1">Active Events</Card.Title>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0">{metrics?.active_events || 0}</h2>
                <div className="bg-warning bg-opacity-10 p-2 rounded">
                  <i className="bi bi-activity text-warning"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="text-muted small mb-1">Avg. Capacity</Card.Title>
              <div className="d-flex justify-content-between align-items-center">
                <h2 className="mb-0">{metrics?.avg_capacity ? Math.round(metrics.avg_capacity) : 0}</h2>
                <div className="bg-info bg-opacity-10 p-2 rounded">
                  <i className="bi bi-people text-info"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Check-in Stats */}
      <Card className="shadow-sm">
        <Card.Header>
          <h5 className="mb-0">Event Check-ins</h5>
        </Card.Header>
        <Card.Body>
          {stats.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Check-ins</th>
                    <th>Capacity</th>
                    <th style={{ width: '200px' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.event_id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <Badge bg={stat.checked_in > 0 ? 'success' : 'secondary'} className="rounded-pill">
                              {stat.checked_in}
                            </Badge>
                          </div>
                          <div>
                            <div className="fw-medium">{stat.event_name}</div>
                            <small className="text-muted">
                              {Math.round(stat.checkin_percentage)}% checked in
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{stat.checked_in} / {stat.total_capacity}</td>
                      <td>{stat.total_capacity}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 me-2">
                            <ProgressBar 
                              now={stat.checkin_percentage} 
                              variant={getVariant(stat.checkin_percentage)}
                              style={{ height: '6px' }}
                            />
                          </div>
                          <small className="text-muted" style={{ width: '40px' }}>
                            {Math.round(stat.checkin_percentage)}%
                          </small>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              No event statistics available
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EventMetrics;
