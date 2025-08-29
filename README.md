# Baby Heartbeat Generator

Create personalized baby heartbeat recordings with whisper overlay. Upload ultrasound images for automatic BPM detection, generate 3-second samples, and share on social media.

## Features

- **Ultrasound BPM Detection**: Upload ultrasound images for automatic BPM detection
- **Manual BPM Input**: Enter BPM manually or use default 140 BPM
- **3-Second Sample Creation**: Generate samples with whisper overlay
- **Social Media Sharing**: Share samples on Facebook, Twitter, and Instagram
- **Preview Only**: Samples can be previewed but not downloaded without payment

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Add baseline audio file**:
   - Place `baseline-heartbeat.wav` in the project root
   - This is the 8-second baseline audio file used for processing

3. **Add whisper audio file (optional)**:
   - Place `whisper-audio.wav` in the project root
   - This will replace the simulated whisper audio
   - If not provided, the system uses simulated whisper audio

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Step 1: Upload Ultrasound Image
1. Click "Choose Image" to upload your ultrasound image
2. The system will automatically detect the BPM
3. If detection fails, you can enter the BPM manually or use the default 140 BPM

### Step 2: Create Sample
1. Click "Create Free Sample" to generate a 3-second sample
2. The sample combines your baby's heartbeat with a gentle whisper overlay
3. Preview the sample using the built-in audio player
4. Share on social media using the provided buttons

## Audio Files

### Required Files
- `baseline-heartbeat.wav`: 8-second baseline heartbeat audio file

### Optional Files
- `whisper-audio.wav`: Actual whisper audio file (replaces simulated whisper)

## Technical Details

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Audio Processing**: Custom WAV processing with JavaScript
- **BPM Detection**: Computer vision analysis using Sharp
- **Social Sharing**: Direct integration with Facebook, Twitter, and Instagram APIs

## Security Features

- **Download Prevention**: Audio files are served with `inline` disposition
- **Context Menu Disabled**: Right-click context menu is disabled on audio players
- **Keyboard Shortcuts Blocked**: Download shortcuts (Ctrl+S, Cmd+S) are prevented
- **Controls Restricted**: Audio controls are limited to prevent downloads

## Next Steps

- [ ] Add actual whisper audio file
- [ ] Implement payment processing for full downloads
- [ ] Add user authentication
- [ ] Implement premium features

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

- `POST /api/detect-bpm`: Detect BPM from uploaded ultrasound image
- `POST /api/create-sample-baseline`: Create 3-second sample with whisper overlay

## License

This project is proprietary software. All rights reserved.
