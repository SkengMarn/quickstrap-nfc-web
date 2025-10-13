// Autonomous System Types for AI-Driven NFC Portal

export interface AutoGateView {
  id: string;
  name: string;
  status: 'learning' | 'active' | 'auto-archived';
  autoPromotedAt?: Date;
  autoCreatedAt: Date;
  confidenceHistory: number[]; // Track confidence growth
  autoMergedFrom?: string[]; // Show which duplicates were absorbed
  projectedLifetime: 'temporary' | 'permanent';
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  scanCount: number;
  category: string;
  confidence: number;
}

export interface AutoMergeEvent {
  id: string;
  timestamp: Date;
  primaryGate: string;
  absorbedGates: string[];
  reason: 'spatial-clustering' | 'low-sample-count' | 'category-consolidation';
  confidence: number;
  checkinsTransferred: number;
  decision: 'auto-approved'; // Always auto
  spatialSimilarity: number;
  performanceImpact: number;
}

export interface SystemHealthAuto {
  autoHealingRate: number; // % of issues auto-resolved
  interventionRequired: 0; // Always zero
  lastAutoCleanup: Date;
  issuesAutoResolved: {
    duplicatesMerged: number;
    deadGatesRemoved: number;
    gatesPromoted: number;
    lowConfidenceArchived: number;
  };
  nextMaintenanceCycle: Date; // Scheduled background job
  uptime: number;
  selfRecoveryCount: number;
}

export interface EventAutoDetection {
  eventType: 'single-location' | 'multi-gate' | 'roaming'; // Auto-detected
  gateStrategy: 'virtual-by-category' | 'physical-discovery' | 'hybrid';
  adaptedAt: Date;
  confidence: number;
  reasoning: string; // "96% of scans within 50m - single location detected"
  detectedAt: number; // Number of scans when detected
  expectedGateCount: number;
}

export interface AdaptiveThresholds {
  duplicateDistance: number; // Auto-adjusts based on event density
  promotionSampleSize: number; // Learns from historical confidence
  confidenceThreshold: number; // Adapts to data quality
  lastOptimization: Date;
  optimizationHistory: Array<{
    parameter: string;
    oldValue: number;
    newValue: number;
    reason: string;
    performanceImprovement: number;
    timestamp: Date;
  }>;
}

export interface DecisionExplanation {
  decision: 'created' | 'merged' | 'promoted' | 'archived';
  factors: Array<{
    metric: string;
    value: number;
    weight: number;
    impact: 'positive' | 'negative';
  }>;
  primaryReason: string; // "95% of scans within 30m radius"
  confidenceBreakdown: {
    spatialConsistency: number;
    sampleSize: number;
    temporalStability: number;
    categoryDistribution: number;
  };
}

export interface AutonomousPerformance {
  decisionsPerHour: number;
  accuracyRate: number; // Validated by subsequent events
  falsePositiveRate: number; // Self-detected mistakes
  autoCorrections: number; // Times system fixed its own errors
  learningVelocity: number; // How fast thresholds converge
  totalDecisions: number;
  validatedDecisions: number;
}

export interface AutoEvent {
  id: string;
  channel: 'ai:gate-discovered' | 'ai:duplicate-merged' | 
           'ai:gate-promoted' | 'ai:gate-archived' | 
           'ai:threshold-optimized' | 'ai:pattern-detected';
  
  data: {
    action: string;
    reasoning: string;
    confidence: number;
    affectedEntities: string[];
    performanceImpact: number;
    humanReviewRequired: false; // Always false
    timestamp: Date;
    metadata: Record<string, any>;
  };
}

export interface GateLifecycleStage {
  stage: 'pattern-detected' | 'probation' | 'confirmed' | 'auto-archived';
  scanCount: number;
  confidence: number;
  timeInStage: number; // milliseconds
  nextStageThreshold: number;
  autoPromotionEligible: boolean;
}

export interface PatternRecognition {
  id: string;
  patternType: 'spatial-cluster' | 'temporal-pattern' | 'category-emergence' | 'traffic-flow';
  confidence: number;
  detectedAt: Date;
  location?: { lat: number; lng: number; radius: number };
  timePattern?: { hour: number; dayOfWeek: number; frequency: number };
  categoryPattern?: { category: string; frequency: number };
  impact: 'gate-creation' | 'gate-merge' | 'threshold-adjustment' | 'anomaly-detection';
  validated: boolean;
  validationScore?: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'traffic-surge' | 'gate-closure' | 'pattern-shift' | 'capacity-warning';
  confidence: number;
  timeframe: number; // minutes from now
  location?: string;
  expectedImpact: 'low' | 'medium' | 'high';
  recommendation: string;
  basedOn: string[]; // What data points led to this prediction
  accuracy?: number; // If prediction has been validated
}
