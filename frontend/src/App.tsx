import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Layers, 
  SunMedium, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  Server, 
  Zap, 
  AlertCircle, 
  RefreshCw, 
  Cpu,
  Image as ImageIcon
} from 'lucide-react';
import { healthService } from './services/healthService';
import { SystemHealthResponse, ApiError } from './types/api';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'overview'>('analysis');
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchBackendHealth = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else if (!health) {
      setLoading(true);
    }
    
    try {
      const data = await healthService.getHealth();
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
    } catch (err: any) {
      // If we already had a healthy state, keep it unless manual refresh fails
      if (isManualRefresh || !health) {
        setError(err as ApiError);
        setHealth(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [health]);

  useEffect(() => {
    fetchBackendHealth();
    const interval = setInterval(() => fetchBackendHealth(false), 15000);
    return () => clearInterval(interval);
  }, [fetchBackendHealth]);

  const conditions = [
    {
      id: 1,
      name: "Original Image",
      subtitle: "Condition 1 (Baseline)",
      icon: Eye,
      color: "from-slate-700 to-slate-900",
      accent: "border-slate-700 text-slate-400",
      description: "Raw low-light image with sensor noise, low photon counts, and compressed dynamic range passed directly to YOLO11."
    },
    {
      id: 2,
      name: "CLAHE",
      subtitle: "Condition 2 (Classical)",
      icon: SunMedium,
      color: "from-blue-900/40 to-slate-900",
      accent: "border-blue-500/40 text-blue-400",
      description: "Contrast Limited Adaptive Histogram Equalization applied in CIELAB space on the L* luminance channel. Fast, zero-parameter baseline."
    },
    {
      id: 3,
      name: "Zero-DCE",
      subtitle: "Condition 3 (Deep Curves)",
      icon: Zap,
      color: "from-amber-900/40 to-slate-900",
      accent: "border-amber-500/40 text-amber-400",
      description: "Deep Curve Estimation using an unsupervised lightweight CNN (~79K params) formulating illumination restoration as high-order tone curves."
    },
    {
      id: 4,
      name: "Retinexformer",
      subtitle: "Condition 4 (SOTA Transformer)",
      icon: Sparkles,
      color: "from-purple-900/40 to-slate-900",
      accent: "border-purple-500/40 text-purple-400",
      description: "One-stage Retinex-based Transformer utilizing Illumination-Guided Multi-Head Self-Attention (IG-MSA) for deep degradation restoration."
    }
  ];

  const exdarkClasses = [
    "Bicycle", "Boat", "Bottle", "Bus", "Car", "Cat", 
    "Chair", "Cup", "Dog", "Motorbike", "People", "Table"
  ];

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  LUXVISION AI
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Phase 5
                </span>
              </div>
            </div>

            {/* Main Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                  activeTab === 'analysis'
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image Analysis</span>
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>System Overview</span>
              </button>
            </nav>
          </div>

          {/* Backend Connection Status Live Indicator */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              loading && !health
                ? 'bg-slate-800/50 border-slate-700 text-slate-400' 
                : health 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                loading && !health ? 'bg-slate-400 animate-pulse' : health ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span>
                {loading && !health 
                  ? 'Connecting...' 
                  : health 
                  ? `Backend Online (${health.runtime.device})` 
                  : 'Backend Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {/* Render Tab Content */}
        {activeTab === 'analysis' ? (
          <ImageAnalysisPage />
        ) : (
          <div className="space-y-12 animate-fadeIn">
            {/* Research Title & Abstract */}
            <section className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-semibold mb-6">
                <Activity className="w-3.5 h-3.5" />
                <span>Research Paper Implementation & Integration</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Comparative Analysis of Low-Light Image Enhancement Techniques for{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Improved Object Detection
                </span>
              </h1>

              <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                Benchmarking classical physics-based methods, deep curve estimation, and transformer attention 
                when detecting objects using <strong>YOLO11</strong> on the <strong>ExDark</strong> dataset under uniform experimental conditions.
              </p>
            </section>

            {/* The 4 Experimental Conditions */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">The Four Comparative Conditions</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Each input low-light frame is evaluated under strictly identical detection hyperparameters
                  </p>
                </div>
                <span className="text-xs text-cyan-400 font-medium hidden sm:inline-block">
                  YOLO11 Baseline (conf=0.25, iou=0.45)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {conditions.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div 
                      key={item.id}
                      className={`rounded-xl border bg-gradient-to-b ${item.color} p-6 flex flex-col justify-between transition-all duration-200 hover:border-slate-500/60 hover:shadow-xl`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.accent}`}>
                            {item.subtitle}
                          </span>
                          <IconComponent className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <span>Target Detector</span>
                        <span className="font-semibold text-slate-200">YOLO11</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ExDark Categories & Live Backend Diagnostics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* ExDark Categories Display */}
              <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0E131F] p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">ExDark Benchmark Categories (12 Classes)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Standardized taxonomy supported across all evaluation runs and detection metrics:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exdarkClasses.map((cat, idx) => (
                    <span 
                      key={cat}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{cat}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{idx}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Backend Connection Card */}
              <div className="rounded-xl border border-slate-800 bg-[#0E131F] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Server className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-bold text-white">Backend Integration</h3>
                    </div>
                    
                    <button
                      onClick={() => fetchBackendHealth(true)}
                      disabled={loading || refreshing}
                      title="Refresh backend status"
                      className="p-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>

                  {health && (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Connection</span>
                        <span className="text-emerald-400 font-semibold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> HTTP 200 OK
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Python Version</span>
                        <span className="font-mono text-slate-200">{health.runtime.python_version}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">PyTorch Runtime</span>
                        <span className="font-mono text-cyan-300">{health.runtime.torch_version}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Compute Device</span>
                        <span className="font-mono text-slate-200 flex items-center">
                          <Cpu className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {health.runtime.device}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Environment</span>
                        <span className="font-mono text-slate-200 uppercase">{health.environment}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800">
                        <span className="text-slate-400">API Endpoint</span>
                        <span className="font-mono text-slate-400 truncate max-w-[160px]" title={apiUrl}>
                          {apiUrl}
                        </span>
                      </div>
                    </div>
                  )}

                  {loading && !health && (
                    <div className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                      <p className="text-slate-300 font-medium">Connecting to FastAPI backend...</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{apiUrl}/health</p>
                    </div>
                  )}

                  {error && !loading && (
                    <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs space-y-3">
                      <div className="flex items-start space-x-2 text-rose-400 font-semibold">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Connection Failed</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {error.message}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => fetchBackendHealth(false)}
                          className="w-full py-1.5 px-3 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-medium transition-colors text-xs"
                        >
                          Retry Connection
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {lastChecked ? `Synced ${lastChecked.toLocaleTimeString()}` : 'Synchronizing...'}
                  </span>
                  <span className="text-purple-400 font-medium">Phase 5 Integrated (All 4 Conditions)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-6 text-center text-xs text-slate-500">
        <p>LUXVISION AI — Low-Light Image Enhancement & Object Detection Research Platform</p>
      </footer>
    </div>
  );
}
