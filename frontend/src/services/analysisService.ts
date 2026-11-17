import apiClient from './api';
import { AnalysisResponse } from '../types/analysis';

export const analysisService = {
  /**
   * Sends a low-light image file to the FastAPI backend for CLAHE enhancement.
   */
  async analyzeImage(file: File): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<AnalysisResponse>('/inference/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default analysisService;

