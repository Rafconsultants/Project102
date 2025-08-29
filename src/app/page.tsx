'use client';

import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { audioProcessor, AudioProcessingOptions } from '../utils/audioProcessor';

export default function Home() {
  const [bpm, setBpm] = useState(120);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
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
  const [currentStep, setCurrentStep] = useState<'image' | 'audio' | 'process'>('image');
  const [showSampleSection, setShowSampleSection] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sampleAudioRef = useRef<HTMLAudioElement>(null);
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
        setCurrentStep('process');
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
      console.log(`Starting audio processing for BPM: ${bpm}`);
      
      // Test 1: Check if baseline audio endpoint is accessible
      console.log('Step 1: Testing baseline audio endpoint...');
      const response = await fetch('/api/baseline-audio');
      if (!response.ok) {
        throw new Error(`Failed to load baseline audio: ${response.status} ${response.statusText}`);
      }
      
      console.log('Step 2: Loading baseline audio blob...');
      const audioBlob = await response.blob();
      console.log(`Loaded baseline audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      if (audioBlob.size === 0) {
        throw new Error('Baseline audio blob is empty');
      }
      
      console.log('Step 3: Creating audio file...');
      const audioFile = new File([audioBlob], 'baseline-heartbeat.wav', { type: 'audio/wav' });
      console.log(`Created audio file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);
      
      // Test 4: Verify audio file is valid
      if (audioFile.size === 0) {
        throw new Error('Audio file is empty');
      }
      
      console.log('Step 4: Processing audio...');
      // Process the audio with the target BPM and 8-second duration
      const options: AudioProcessingOptions = {
        bpm: bpm,
        targetDuration: 8, // Ensure 8 seconds
        volume: 1.0
      };
      
      console.log(`Processing options:`, options);
      const result = await audioProcessor.processAudio(audioFile, options);
      
      console.log(`Processing completed:`, result);
      
      // Create a blob from the processed audio
      const processedBlob = new Blob([result.audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(processedBlob);
      setAudioUrl(url);
      setShowSampleSection(true);
      
      console.log(`Processed audio: ${result.duration.toFixed(2)}s at ${result.bpm} BPM`);
      console.log(`Original BPM: 140, Target BPM: ${result.bpm}`);
      console.log(`Expected tempo change: ${result.bpm > 140 ? 'FASTER' : 'SLOWER'}`);
      
      // Calculate enhanced effects
      const baseTempoRatio = (result.bpm/140).toFixed(3);
      let enhancedTempoRatio = baseTempoRatio;
      let speedChange = "normal";
      
      if (result.bpm > 140) {
        enhancedTempoRatio = (parseFloat(baseTempoRatio) * 1.3).toFixed(3);
        speedChange = `${((result.bpm/140 - 1) * 100 * 1.3).toFixed(1)}% faster`;
      } else if (result.bpm < 140) {
        enhancedTempoRatio = (parseFloat(baseTempoRatio) * 0.6).toFixed(3);
        speedChange = `${((1 - result.bpm/140) * 100 * 0.6).toFixed(1)}% slower`;
      }
      
      console.log(`Base Tempo Ratio: ${baseTempoRatio}, Enhanced: ${enhancedTempoRatio}`);
      console.log(`Speed Change: ${speedChange}`);
      console.log(`Processed blob size: ${processedBlob.size} bytes`);
      
      // Test 5: Verify processed audio
      if (processedBlob.size === 0) {
        throw new Error('Processed audio blob is empty');
      }
      
      console.log('✅ Audio processing completed successfully!');
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to process audio: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSample = async () => {
    setIsCreatingSample(true);
    try {
      // Load the baseline audio file
      const response = await fetch('/api/baseline-audio');
      if (!response.ok) {
        throw new Error('Failed to load baseline audio');
      }
      
      const audioBlob = await response.blob();
      const audioFile = new File([audioBlob], 'baseline-heartbeat.wav', { type: 'audio/wav' });
      
      // Create a 3-second sample with whisper overlay effect
      const options: AudioProcessingOptions = {
        bpm: bpm,
        targetDuration: 3, // 3 seconds for sample
        volume: 0.7 // Reduced volume for whisper effect
      };
      
      const result = await audioProcessor.createSampleAudio(audioFile, options);
      
      // Create a blob from the processed sample
      const sampleBlob = new Blob([result.audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(sampleBlob);
      setSampleAudioUrl(url);
      
      console.log(`Created sample: ${result.duration.toFixed(2)}s at ${result.bpm} BPM`);
    } catch (error) {
      console.error('Error creating sample audio:', error);
      alert('Failed to create sample audio. Please try again.');
    } finally {
      setIsCreatingSample(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePlayPauseSample = () => {
    if (sampleAudioRef.current) {
      if (isPlayingSample) {
        sampleAudioRef.current.pause();
      } else {
        sampleAudioRef.current.play();
      }
      setIsPlayingSample(!isPlayingSample);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleSampleAudioEnded = () => {
    setIsPlayingSample(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const resetProcess = () => {
    setUploadedImage(null);
    setUploadedAudio(null);
    setBpmDetectionResult(null);
    setShowManualInput(false);
    setCurrentStep('image');
    setAudioUrl(null);
    setSampleAudioUrl(null);
    setShowSampleSection(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const shareToSocialMedia = (platform: string) => {
    const text = `Listen to my baby's heartbeat at ${bpm} BPM! Created with Baby Heartbeat Generator ❤️`;
    const url = window.location.href;
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct sharing via URL, so we'll copy to clipboard
        navigator.clipboard.writeText(`${text}\n\n${url}`);
        alert('Link copied to clipboard! You can paste it in your Instagram story or post.');
        return;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Baby Heartbeat Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your ultrasound image and audio to create personalized baby heartbeat recordings
          </p>
        </header>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep === 'image' ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'image' ? 'border-pink-600 bg-pink-100' : 'border-gray-300'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Upload Image</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${currentStep === 'audio' ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'audio' ? 'border-pink-600 bg-pink-100' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Upload Audio</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${currentStep === 'process' ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'process' ? 'border-pink-600 bg-pink-100' : 'border-gray-300'
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
                      onClick={() => setCurrentStep('process')}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Continue to Generation
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => setCurrentStep('process')}
                  className="text-pink-600 hover:text-pink-700 font-medium"
                >
                  Skip audio upload and generate with detected BPM only
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing Section */}
          {currentStep === 'process' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Step 3: Generate Baby Heartbeat Audio
              </h2>
              
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Summary</h3>
                <div className="space-y-2 text-blue-700">
                  <p>• Detected BPM: <span className="font-semibold">{bpm}</span></p>
                  {uploadedAudio && <p>• Audio file uploaded</p>}
                  {!uploadedAudio && <p>• Using generated audio based on BPM</p>}
                </div>
              </div>

              {/* BPM Input Section (for final adjustment) */}
              <div className="mb-8">
                <label htmlFor="bpm" className="block text-lg font-semibold text-gray-800 mb-4">
                  Final BPM Adjustment (if needed)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    id="bpm"
                    min="60"
                    max="200"
                    value={bpm}
                    onChange={handleBpmChange}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <input
                    type="number"
                    value={bpm}
                    onChange={handleBpmChange}
                    min="60"
                    max="200"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                  />
                  <span className="text-gray-600 font-medium">BPM</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Range: 60-200 BPM (typical baby heartbeat: 120-160 BPM)
                </div>
              </div>

              {/* Process Button */}
              <div className="mb-8">
                <button
                  onClick={handleProcessAudio}
                  disabled={isProcessing || isDetectingBpm || isUploadingAudio}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Processing Audio...
                    </div>
                  ) : (
                    'Generate Baby Heartbeat Audio'
                  )}
                </button>
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Your Baby's Heartbeat Audio ({bpm} BPM)
                  </h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePlayPause}
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-full hover:shadow-lg transition-all"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={handleAudioEnded}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="w-full"
                        controls
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={resetProcess}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* Sample Audio Section */}
          {showSampleSection && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                🎁 Free Sample (3 seconds with whisper overlay)
              </h2>
              
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 mb-4">
                  Create a 3-second sample with a gentle whisper overlay. Perfect for sharing on social media!
                </p>
                
                {!sampleAudioUrl ? (
                  <button
                    onClick={handleCreateSample}
                    disabled={isCreatingSample}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSample ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Creating Sample...
                      </div>
                    ) : (
                      'Create Free Sample'
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Your Sample Audio ({bpm} BPM)
                      </h3>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handlePlayPauseSample}
                          className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-full hover:shadow-lg transition-all"
                        >
                          {isPlayingSample ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          <audio
                            ref={sampleAudioRef}
                            src={sampleAudioUrl}
                            onEnded={handleSampleAudioEnded}
                            onPlay={() => setIsPlayingSample(true)}
                            onPause={() => setIsPlayingSample(false)}
                            className="w-full"
                            controls
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Media Sharing */}
                    <div className="bg-white rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Share Your Sample
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Share your baby's heartbeat sample with friends and family!
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => shareToSocialMedia('facebook')}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </button>
                        <button
                          onClick={() => shareToSocialMedia('twitter')}
                          className="flex-1 bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          Twitter
                        </button>
                        <button
                          onClick={() => shareToSocialMedia('instagram')}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z"/>
                          </svg>
                          Instagram
                        </button>
                      </div>
                    </div>

                    {/* Premium Upgrade CTA */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        🎵 Want the Full Version?
                      </h3>
                      <p className="text-yellow-700 mb-3">
                        Get the complete 8-second audio without whisper overlay for just $4.99!
                      </p>
                      <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all">
                        Upgrade to Premium
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to Use:</h3>
            <ol className="text-blue-700 space-y-1">
              <li>1. Upload your ultrasound image to automatically detect BPM</li>
              <li>2. Optionally upload ultrasound audio for enhanced processing</li>
              <li>3. Adjust BPM if needed and generate your personalized audio</li>
              <li>4. Create a free 3-second sample with whisper overlay</li>
              <li>5. Share your sample on social media or upgrade to premium</li>
            </ol>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 text-center text-gray-600">
          <p>Advanced ultrasound analysis with automatic BPM detection and social sharing</p>
          <p className="text-sm mt-2">Next: User authentication and payment processing</p>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #ec4899, #8b5cf6);
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #ec4899, #8b5cf6);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
