import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Image as ImageIcon,
  CheckCircle2,
  Columns,
  Maximize2,
  Zap,
  Info,
  Sliders,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { analysisService } from '../services/analysisService';
import { AnalysisResponse, ConditionResult } from '../types/analysis';
import { ImageCompareSlider } from '../components/comparison/ImageCompareSlider';

type SliderComparisonMode = 
  | 'orig-vs-clahe' 
  | 'orig-vs-zerodce' 
  | 'orig-vs-retinex'
  | 'clahe-vs-zerodce'
  | 'zerodce-vs-retinex';

export function ImageAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderMode, setSliderMode] = useState<SliderComparisonMode>('orig-vs-clahe');
  const [showDetections, setShowDetections] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
    }
  };

  const setFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid JPG, PNG, or WebP image.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // Submit to FastAPI backend
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analysisService.analyzeImage(selectedFile);
      setAnalysisResult(result);
      
      // Auto-switch slider to Retinexformer or Zero-DCE if available, or keep CLAHE
      const retinex = result.conditions.find(c => c.id === 'retinexformer');
      const zdce = result.conditions.find(c => c.id === 'zero_dce');
      if (retinex && retinex.status === 'ready') {
        setSliderMode('orig-vs-retinex');
      } else if (zdce && zdce.status === 'ready') {
        setSliderMode('orig-vs-zerodce');
      } else {
        setSliderMode('orig-vs-clahe');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image on the backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Built-in synthetic sample generator for quick testing
  const handleLoadSample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, 640, 480);
      
      ctx.fillStyle = '#1e2838';
      ctx.fillRect(50, 180, 200, 220); // car silhouette
      ctx.fillStyle = '#151c27';
      ctx.fillRect(320, 140, 80, 260); // pedestrian silhouette
      ctx.fillStyle = '#222f42';
      ctx.fillRect(450, 250, 140, 150); // bicycle silhouette
      
      const grad = ctx.createRadialGradient(360, 80, 5, 360, 80, 180);
      grad.addColorStop(0, 'rgba(255, 230, 150, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'exdark_sample_night.jpg', { type: 'image/jpeg' });
          setFile(sampleFile);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const originalCondition = analysisResult?.conditions.find((c) => c.id === 'original');
  const claheCondition = analysisResult?.conditions.find((c) => c.id === 'clahe');
  const zeroDceCondition = analysisResult?.conditions.find((c) => c.id === 'zero_dce');
  const retinexCondition = analysisResult?.conditions.find((c) => c.id === 'retinexformer');

  // Helper to select clean vs annotated image based on toggle
  const getDisplayImage = (cond: ConditionResult | undefined) => {
    if (!cond) return '';
    if (showDetections && cond.annotated_image_url) {
      return cond.annotated_image_url;
    }
    return cond.image_url || '';
  };

  // Determine current images for slider based on active sliderMode and detection toggle
  let sliderLeftImg = getDisplayImage(originalCondition);
  let sliderRightImg = getDisplayImage(claheCondition);
  let sliderLeftLabel = showDetections 
    ? `Condition 1: Original (${originalCondition?.detection_count ?? 0} detected)` 
    : 'Condition 1: Original Low-Light';
  let sliderRightLabel = showDetections 
    ? `Condition 2: CLAHE (${claheCondition?.detection_count ?? 0} detected)` 
    : 'Condition 2: CLAHE Enhanced';
  let sliderLatency: number | null | undefined = claheCondition?.latency_ms;
  let sliderEntropyGain: number | undefined = claheCondition?.entropy_gain;

  if (sliderMode === 'orig-vs-zerodce' && zeroDceCondition?.image_url) {
    sliderLeftImg = getDisplayImage(originalCondition);
    sliderRightImg = getDisplayImage(zeroDceCondition);
    sliderLeftLabel = showDetections 
      ? `Condition 1: Original (${originalCondition?.detection_count ?? 0} detected)` 
      : 'Condition 1: Original Low-Light';
    sliderRightLabel = showDetections 
      ? `Condition 3: Zero-DCE (${zeroDceCondition.detection_count ?? 0} detected)` 
      : 'Condition 3: Zero-DCE Enhanced';
    sliderLatency = zeroDceCondition.latency_ms;
    sliderEntropyGain = zeroDceCondition.entropy_gain;
  } else if (sliderMode === 'orig-vs-retinex' && retinexCondition?.image_url) {
    sliderLeftImg = getDisplayImage(originalCondition);
    sliderRightImg = getDisplayImage(retinexCondition);
    sliderLeftLabel = showDetections 
      ? `Condition 1: Original (${originalCondition?.detection_count ?? 0} detected)` 
      : 'Condition 1: Original Low-Light';
    sliderRightLabel = showDetections 
      ? `Condition 4: Retinexformer (${retinexCondition.detection_count ?? 0} detected)` 
      : 'Condition 4: Retinexformer Enhanced';
    sliderLatency = retinexCondition.latency_ms;
    sliderEntropyGain = retinexCondition.entropy_gain;
  } else if (sliderMode === 'clahe-vs-zerodce' && claheCondition?.image_url && zeroDceCondition?.image_url) {
    sliderLeftImg = getDisplayImage(claheCondition);
    sliderRightImg = getDisplayImage(zeroDceCondition);
    sliderLeftLabel = showDetections 
      ? `Condition 2: CLAHE (${claheCondition.detection_count ?? 0} detected)` 
      : 'Condition 2: CLAHE (Classical)';
    sliderRightLabel = showDetections 
      ? `Condition 3: Zero-DCE (${zeroDceCondition.detection_count ?? 0} detected)` 
      : 'Condition 3: Zero-DCE (Deep Curves)';
    sliderLatency = zeroDceCondition.latency_ms;
    sliderEntropyGain = zeroDceCondition.entropy_gain;
  } else if (sliderMode === 'zerodce-vs-retinex' && zeroDceCondition?.image_url && retinexCondition?.image_url) {
    sliderLeftImg = getDisplayImage(zeroDceCondition);
    sliderRightImg = getDisplayImage(retinexCondition);
    sliderLeftLabel = showDetections 
      ? `Condition 3: Zero-DCE (${zeroDceCondition.detection_count ?? 0} detected)` 
      : 'Condition 3: Zero-DCE (Curves)';
    sliderRightLabel = showDetections 
      ? `Condition 4: Retinexformer (${retinexCondition.detection_count ?? 0} detected)` 
      : 'Condition 4: Retinexformer (SOTA)';
    sliderLatency = retinexCondition.latency_ms;
    sliderEntropyGain = retinexCondition.entropy_gain;
  }

  return (
    <div className="space-y-10">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <span>Image Analysis, Enhancement & YOLO11 Object Detection</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            YOLO11 Active
          </span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload any dark low-light image to evaluate all four benchmark conditions simultaneously (Original, CLAHE, Zero-DCE, Retinexformer) and quantify object detection performance with YOLO11 on ExDark categories.
        </p>
      </div>

      {/* Upload & Preview Card */}
      {!analysisResult && (
        <div className="rounded-2xl border border-slate-800 bg-[#0E131F] p-8 shadow-xl">
          {!previewUrl ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-12 text-center cursor-pointer transition-all duration-200 bg-slate-900/40 hover:bg-slate-900/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-cyan-950/80 text-slate-400 group-hover:text-cyan-400 flex items-center justify-center mx-auto mb-4 transition-colors">
                <Upload className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                Drag and drop your low-light image here
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Supports JPG, PNG, and WebP formats
              </p>

              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-600/20"
                >
                  Browse Local Files
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-colors"
                >
                  Load Sample Dark Image
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview Box */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-full md:w-64 h-48 rounded-lg overflow-hidden border border-slate-700 bg-black flex items-center justify-center relative flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Low-light preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-300">
                    Preview
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>{selectedFile?.name}</span>
                  </div>
                  <p className="text-slate-400">
                    Size: {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
                  </p>
                  <p className="text-slate-400">
                    Format: {selectedFile?.type || 'image/jpeg'}
                  </p>
                  <p className="text-emerald-400 flex items-center pt-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Ready for Multi-Condition Enhancement & YOLO11 Detection
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 w-full md:w-auto">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Running Enhancements & YOLO11 Detection...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze, Enhance & Detect Objects</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Choose Different Image</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Results View */}
      {analysisResult && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <h3 className="font-bold text-white text-sm">
                  Comparative Analysis: {analysisResult.filename}
                </h3>
                <p className="text-xs text-slate-400">
                  Dimensions: {analysisResult.image_dimensions.width} × {analysisResult.image_dimensions.height} px • Downstream Model: YOLO11-Nano (ExDark taxonomy)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Detection Overlay Toggle */}
              <button
                onClick={() => setShowDetections(!showDetections)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                  showDetections
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle YOLO11 bounding boxes and labels"
              >
                {showDetections ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Detections Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Show Detections</span>
                  </>
                )}
              </button>

              {/* Toggle Slider vs Side-by-side */}
              <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('slider')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                    viewMode === 'slider' ? 'bg-cyan-600 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Comparison Slider</span>
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center space-x-1.5 ${
                    viewMode === 'side-by-side' ? 'bg-cyan-600 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side-by-Side (4 Views)</span>
                </button>
              </div>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload New</span>
              </button>
            </div>
          </div>

          {/* Interactive Visualizer */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0E131F] space-y-4">
            {/* Slider Target Switcher Controls (When in slider mode) */}
            {viewMode === 'slider' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Select Slider Comparison Pair:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSliderMode('orig-vs-clahe')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sliderMode === 'orig-vs-clahe'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Original vs. CLAHE
                  </button>

                  <button
                    onClick={() => setSliderMode('orig-vs-zerodce')}
                    disabled={zeroDceCondition?.status !== 'ready'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      sliderMode === 'orig-vs-zerodce'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Original vs. Zero-DCE</span>
                  </button>

                  <button
                    onClick={() => setSliderMode('orig-vs-retinex')}
                    disabled={retinexCondition?.status !== 'ready'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      sliderMode === 'orig-vs-retinex'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Original vs. Retinexformer</span>
                  </button>

                  <button
                    onClick={() => setSliderMode('clahe-vs-zerodce')}
                    disabled={zeroDceCondition?.status !== 'ready'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      sliderMode === 'clahe-vs-zerodce'
                        ? 'bg-cyan-600 text-black shadow-md shadow-cyan-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <span>CLAHE vs. Zero-DCE</span>
                  </button>

                  <button
                    onClick={() => setSliderMode('zerodce-vs-retinex')}
                    disabled={zeroDceCondition?.status !== 'ready' || retinexCondition?.status !== 'ready'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      sliderMode === 'zerodce-vs-retinex'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <span>Zero-DCE vs. Retinexformer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Slider or Side-by-Side Presentation */}
            {viewMode === 'slider' ? (
              <ImageCompareSlider
                originalSrc={sliderLeftImg}
                enhancedSrc={sliderRightImg}
                originalLabel={sliderLeftLabel}
                enhancedLabel={sliderRightLabel}
                latencyMs={sliderLatency}
                entropyGain={sliderEntropyGain}
              />
            ) : (
              /* Side-by-Side (4 Views) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Original */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Condition 1: Original</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {originalCondition?.detection_count ?? 0} objs
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center relative">
                    <img
                      src={getDisplayImage(originalCondition)}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* 2. CLAHE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-400">Condition 2: CLAHE</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[11px]">
                      {claheCondition?.detection_count ?? 0} objs
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-blue-800 bg-black aspect-video flex items-center justify-center relative">
                    <img
                      src={getDisplayImage(claheCondition)}
                      alt="CLAHE Enhanced"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* 3. Zero-DCE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-400">Condition 3: Zero-DCE</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[11px]">
                      {zeroDceCondition?.detection_count ?? 0} objs
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-amber-800 bg-black aspect-video flex items-center justify-center relative">
                    {zeroDceCondition?.status === 'ready' && zeroDceCondition.image_url ? (
                      <img
                        src={getDisplayImage(zeroDceCondition)}
                        alt="Zero-DCE Enhanced"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="p-4 text-center text-xs text-amber-400/80">
                        {zeroDceCondition?.error_message || 'Model setup pending'}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Retinexformer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-400">Condition 4: Retinexformer</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[11px]">
                      {retinexCondition?.detection_count ?? 0} objs
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-purple-800 bg-black aspect-video flex items-center justify-center relative">
                    {retinexCondition?.status === 'ready' && retinexCondition.image_url ? (
                      <img
                        src={getDisplayImage(retinexCondition)}
                        alt="Retinexformer Enhanced"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="p-4 text-center text-xs text-purple-400/80">
                        {retinexCondition?.error_message || 'Model setup pending'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* YOLO11 Detection Benchmark Metrics Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0E131F] p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <Target className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    YOLO11 Object Detection Benchmark (ExDark Taxonomy)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparative detection yield, classification confidence, and detected categories across all enhancement pipelines
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 font-mono">
                  Confidence Threshold: 0.25
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 font-mono">
                  IoU: 0.45
                </span>
              </div>
            </div>

            {/* 4 Conditions Detection Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysisResult.conditions.map((c) => {
                const count = c.detection_count ?? 0;
                const origCount = originalCondition?.detection_count ?? 0;
                const diff = count - origCount;
                const avgConf = c.avg_confidence ? (c.avg_confidence * 100).toFixed(1) : '0.0';
                const detections = c.detections || [];

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-300">{c.name.split(':')[0]}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {c.detection_latency_ms ? `${c.detection_latency_ms.toFixed(1)} ms` : '--'}
                        </span>
                      </div>

                      {/* Objects Found Counter */}
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-white font-mono">{count}</span>
                        <span className="text-xs text-slate-400">objects detected</span>
                        {c.id !== 'original' && (
                          <span
                            className={`text-xs font-semibold font-mono ${
                              diff > 0
                                ? 'text-emerald-400'
                                : diff < 0
                                ? 'text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>

                      {/* Average Confidence */}
                      <div className="mt-2 text-xs flex justify-between text-slate-400">
                        <span>Avg Confidence:</span>
                        <span className="font-mono text-cyan-300 font-semibold">{avgConf}%</span>
                      </div>
                    </div>

                    {/* Detected Object Class Badges */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">
                        Identified Entities:
                      </span>
                      {detections.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {detections.map((d, idx) => (
                            <span
                              key={idx}
                              style={{ borderColor: d.color, color: d.color }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border font-medium flex items-center space-x-1"
                            >
                              <span>{d.class_name}</span>
                              <span className="opacity-70 font-mono">{(d.confidence * 100).toFixed(0)}%</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          No objects detected above threshold
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Measured Processing Time Cards (All 4 Conditions) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Condition 1: Original */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-4 h-4" />
                <span>Condition 1: Original Baseline</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                0.00 <span className="text-xs font-normal text-slate-400">ms</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Entropy: <strong className="text-slate-200">{originalCondition?.entropy?.toFixed(2)}</strong> bits
              </p>
            </div>

            {/* Condition 2: CLAHE */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Condition 2: CLAHE Latency</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {claheCondition?.latency_ms?.toFixed(2)}{' '}
                <span className="text-xs font-normal text-blue-400">ms</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Entropy: <strong className="text-slate-200">{claheCondition?.entropy?.toFixed(2)}</strong> ({claheCondition?.entropy_gain && claheCondition.entropy_gain > 0 ? `+${claheCondition.entropy_gain}` : claheCondition?.entropy_gain} bits)
              </p>
            </div>

            {/* Condition 3: Zero-DCE */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-800/40">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold mb-1">
                <Zap className="w-4 h-4" />
                <span>Condition 3: Zero-DCE Latency</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {zeroDceCondition?.status === 'ready' && zeroDceCondition.latency_ms !== null && zeroDceCondition.latency_ms !== undefined ? (
                  <>
                    {zeroDceCondition.latency_ms.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-amber-400">ms</span>
                  </>
                ) : (
                  <span className="text-sm font-sans text-amber-400">Unavailable</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {zeroDceCondition?.status === 'ready' ? (
                  <>Entropy: <strong className="text-slate-200">{zeroDceCondition.entropy?.toFixed(2)}</strong> ({zeroDceCondition.entropy_gain && zeroDceCondition.entropy_gain > 0 ? `+${zeroDceCondition.entropy_gain}` : zeroDceCondition.entropy_gain} bits)</>
                ) : (
                  'Deep curve estimation unavailable'
                )}
              </p>
            </div>

            {/* Condition 4: Retinexformer */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-800/40">
              <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Condition 4: Retinexformer</span>
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {retinexCondition?.status === 'ready' && retinexCondition.latency_ms !== null && retinexCondition.latency_ms !== undefined ? (
                  <>
                    {retinexCondition.latency_ms.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-purple-400">ms</span>
                  </>
                ) : (
                  <span className="text-sm font-sans text-purple-400">Unavailable</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {retinexCondition?.status === 'ready' ? (
                  <>Entropy: <strong className="text-slate-200">{retinexCondition.entropy?.toFixed(2)}</strong> ({retinexCondition.entropy_gain && retinexCondition.entropy_gain > 0 ? `+${retinexCondition.entropy_gain}` : retinexCondition.entropy_gain} bits)</>
                ) : (
                  'Transformer attention unavailable'
                )}
              </p>
            </div>
          </div>

          {/* The Four Comparative Conditions Status Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">The Four Comparative Conditions Summary</h3>
              <span className="text-xs text-slate-400">Research Paper Benchmark Progress</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysisResult.conditions.map((c: ConditionResult) => {
                const isReady = c.status === 'ready';
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                      isReady
                        ? 'bg-slate-900/90 border-slate-700 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 border-dashed opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          #{c.condition_index}
                        </span>
                        {isReady ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-semibold flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/50 text-[10px] font-semibold">
                            {c.badge || 'Model setup pending'}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm mb-1">{c.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[11px]">
                      {isReady ? (
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Enhancement Latency:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {c.latency_ms !== null ? `${c.latency_ms?.toFixed(2)} ms` : '0.00 ms'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-400/90 italic flex items-center space-x-1">
                          <Info className="w-3.5 h-3.5 mr-1" />
                          <span>{c.badge || 'Setup pending'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAnalysisPage;
