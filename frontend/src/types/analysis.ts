export interface ConditionResult {
  id: string;
  condition_index: number;
  name: string;
  method: string;
  status: 'ready' | 'pending' | 'failed' | 'unavailable';
  image_url?: string | null;
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
