'use client';

import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [bpm, setBpm] = useState(140);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [isDetectingBpm, setIsDetectingBpm] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [bpmDetectionResult, setBpmDetectionResult] = useState<{
    success: boolean;
    bpm?: number;
    message: string;
  } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentStep, setCurrentStep] = useState<'image' | 'audio' | 'adjust'>('image');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: handleAudioUpload
  });

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(parseInt(e.target.value));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Detect BPM from image
    setIsDetectingBpm(true);
    setBpmDetectionResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/detect-bpm', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setBpmDetectionResult(result);

      if (result.success && result.bpm) {
        setBpm(result.bpm);
        setShowManualInput(false);
        setCurrentStep('audio');
      } else {
        setShowManualInput(true);
      }
    } catch (error) {
      console.error('Error detecting BPM:', error);
      setBpmDetectionResult({
        success: false,
        message: 'Failed to detect BPM. Please try again or enter manually.',
      });
      setShowManualInput(true);
    } finally {
      setIsDetectingBpm(false);
    }
  };

  async function handleAudioUpload(acceptedFiles: File[]) {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploadingAudio(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedAudio(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload audio file
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentStep('adjust');
      } else {
        console.error('Failed to upload audio');
        alert('Failed to upload audio file. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert('Error uploading audio file. Please try again.');
    } finally {
      setIsUploadingAudio(false);
    }
  }

  const handleUseDefaultBpm = () => {
    setBpm(140);
    setShowManualInput(false);
    setBpmDetectionResult({
      success: false,
      bpm: 140,
      message: 'Using default BPM of 140',
    });
    setCurrentStep('audio');
  };

  const handleProcessAudio = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process-audio-baseline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bpm: bpm,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        console.error('Failed to process audio');
        alert('Failed to process audio. Please try again.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Error processing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const resetProcess = () => {
    setUploadedImage(null);
    setUploadedAudio(null);
    setBpmDetectionResult(null);
    setShowManualInput(false);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentStep('image');
    setBpm(140);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-800 mb-4">
            Baby Heartbeat Generator
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Upload your ultrasound image and audio to create personalized baby heartbeat recordings
          </p>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center ${currentStep === 'image' ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'image' ? 'border-red-600 bg-red-100' : 'border-gray-300'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Upload Image</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${currentStep === 'audio' ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'audio' ? 'border-red-600 bg-red-100' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Upload Audio</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${currentStep === 'adjust' ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'adjust' ? 'border-red-600 bg-red-100' : 'border-gray-300'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Generate</span>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Image Upload Section */}
          {currentStep === 'image' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Step 1: Upload Ultrasound Image
              </h2>
              
              {!uploadedImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Upload your ultrasound image to automatically detect the baby's heartbeat rate
                  </p>
                  <button
                    onClick={triggerFileUpload}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Choose Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded ultrasound"
                      className="w-full max-w-md mx-auto rounded-lg shadow-md"
                    />
                    <button
                      onClick={resetProcess}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* BPM Detection Status */}
                  {isDetectingBpm && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                        Analyzing ultrasound image for BPM...
                      </div>
                    </div>
                  )}

                  {bpmDetectionResult && (
                    <div className={`p-4 rounded-lg ${
                      bpmDetectionResult.success 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-center mb-2">
                        {bpmDetectionResult.success ? (
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="font-semibold">
                          {bpmDetectionResult.success ? 'BPM Detected!' : 'BPM Detection Failed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{bpmDetectionResult.message}</p>
                      
                      {bpmDetectionResult.success && bpmDetectionResult.bpm && (
                        <p className="text-lg font-bold text-green-600">
                          Detected BPM: {bpmDetectionResult.bpm}
                        </p>
                      )}

                      {showManualInput && (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-gray-600">
                            Please enter the BPM manually or use the default value:
                          </p>
                          <div className="flex items-center space-x-4">
                            <input
                              type="number"
                              value={bpm}
                              onChange={handleBpmChange}
                              min="60"
                              max="200"
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                              placeholder="BPM"
                            />
                            <span className="text-gray-600 font-medium">BPM</span>
                            <button
                              onClick={handleUseDefaultBpm}
                              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              Use Default (140)
                            </button>
                          </div>
                        </div>
                      )}

                      {!showManualInput && (
                        <button
                          onClick={() => setCurrentStep('audio')}
                          className="mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                          Continue to Audio Upload
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Audio Upload Section */}
          {currentStep === 'audio' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Step 2: Upload Ultrasound Audio (Optional)
              </h2>
              
              {!uploadedAudio ? (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-400'
                }`}>
                  <input {...getInputProps()} />
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {isDragActive
                      ? 'Drop your ultrasound audio file here'
                      : 'Drag & drop your ultrasound audio file, or click to select'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supported formats: MP3, WAV, M4A (max 50MB)
                  </p>
                  <button
                    type="button"
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Choose Audio File
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Uploaded Audio Preview
                    </h3>
                    <audio
                      src={uploadedAudio}
                      controls
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setUploadedAudio(null);
                        setCurrentStep('audio');
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Upload Different File
                    </button>
                    <button
                      onClick={() => setCurrentStep('adjust')}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Continue to Generate
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => setCurrentStep('adjust')}
                  className="text-pink-600 hover:text-pink-700 font-medium"
                >
                  Skip audio upload and generate with detected BPM only
                </button>
              </div>
            </div>
          )}

          {/* Step 3: BPM Adjustment Section */}
          {currentStep === 'adjust' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Step 3: Generate Baby Heartbeat Recording
              </h2>
              
              {/* Final BPM Adjustment Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Final BPM Adjustment (if needed)
                </h3>
                
                <div className="space-y-4">
                  {/* BPM Slider and Input */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="range"
                        min="60"
                        max="200"
                        value={bpm}
                        onChange={(e) => setBpm(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${((bpm - 60) / (200 - 60)) * 100}%, #d1d5db ${((bpm - 60) / (200 - 60)) * 100}%, #d1d5db 100%)`
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={bpm}
                        onChange={handleBpmChange}
                        min="60"
                        max="200"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                      <span className="text-gray-600 font-medium">BPM</span>
                    </div>
                  </div>
                  
                  {/* Range Information */}
                  <p className="text-sm text-gray-600">
                    Range: 60-200 BPM (typical baby heartbeat: 120-160 BPM)
                  </p>
                </div>
              </div>
              
              {/* Generate Button */}
              <div className="text-center">
                <button
                  onClick={handleProcessAudio}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate Baby Heartbeat Audio'
                  )}
                </button>
              </div>

              {/* Adjusted Audio Player */}
              {audioUrl && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Your Personalized Baby Heartbeat Recording
                  </h3>
                  
                  <div className="space-y-4">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={handleAudioEnded}
                      controls
                      className="w-full"
                    />
                    
                    <div className="flex items-center justify-center">
                      <button
                        onClick={handlePlayPause}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        {isPlaying ? 'Pause' : 'Play'} Recording
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 text-center">
                      <p>Original BPM: 140 → Target BPM: {bpm}</p>
                      <p>Speed Factor: {(bpm / 140).toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How to Use Section */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            How to Use:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Upload your ultrasound image to automatically detect BPM</li>
            <li>Optionally upload ultrasound audio for enhanced processing</li>
            <li>Generate your personalized baby heartbeat recording</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
