export interface DetectionItem {
  box: [number, number, number, number];
  class_name: string;
  raw_class: string;
  confidence: number;
  color: string;
  is_exdark: boolean;
}

export interface ConditionResult {
  id: string;
  condition_index: number;
  name: string;
  method: string;
  status: 'ready' | 'pending' | 'failed' | 'unavailable';
  image_url?: string | null;
  annotated_image_url?: string | null;
  detections?: DetectionItem[];
  detection_count?: number;
  avg_confidence?: number;
  class_counts?: Record<string, number>;
  detection_latency_ms?: number | null;
  detection_available?: boolean;
  latency_ms?: number | null;
  entropy?: number;
  entropy_gain?: number;
  badge?: string;
  error_message?: string;
  description: string;
  hyperparameters?: Record<string, any>;
  device?: string;
}

export interface AnalysisResponse {
  success: boolean;
  filename: string;
  image_dimensions: {
    width: number;
    height: number;
  };
  conditions: ConditionResult[];
}
