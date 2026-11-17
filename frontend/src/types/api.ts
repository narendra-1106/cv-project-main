/**
 * Type definitions for LUXVISION AI API interactions.
 */

export interface RuntimeInfo {
  python_version: string;
  torch_version: string;
  cuda_available: boolean;
  device: string;
}

export interface ServicesStatus {
  api_gateway: string;
  database: string;
  task_queue: string;
}

export interface SystemHealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
  runtime: RuntimeInfo;
  services: ServicesStatus;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  details?: string;
}

