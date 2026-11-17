import apiClient from './api';
import { SystemHealthResponse } from '../types/api';

/**
 * Service to query backend operational diagnostics and hardware health.
 */
export const healthService = {
  /**
   * Fetches real-time status of the FastAPI backend, PyTorch runtime, and compute device.
   */
  async getHealth(): Promise<SystemHealthResponse> {
    const response = await apiClient.get<SystemHealthResponse>('/health');
    return response.data;
  },
};

export default healthService;

