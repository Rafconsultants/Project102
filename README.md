# Baby Heartbeat Generator

An AI-powered web application that processes ultrasound images and audio to create personalized baby heartbeat recordings with social sharing capabilities.

## 🎯 Features

- **Ultrasound Image Upload**: Upload ultrasound images for automatic BPM detection
- **Audio Processing**: Process ultrasound audio files with BPM adjustment
- **Baseline Audio Integration**: Uses real baby heartbeat audio for authentic results
- **Social Media Sharing**: Share your baby's heartbeat on Facebook, Twitter, and Instagram
- **Freemium Model**: Free 3-second samples with premium 8-second full versions
- **Multi-step Workflow**: Guided process from image upload to audio generation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rafconsultants/Project102.git
   cd Project102
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Audio Processing**: Baseline audio integration (FFmpeg planned)
- **Image Processing**: Sharp for ultrasound analysis
- **File Upload**: React Dropzone for drag-and-drop functionality
- **Project Management**: Taskmaster AI integration

## 📁 Project Structure

```
Project102/
├── src/
│   ├── app/
│   │   ├── api/                    # API endpoints
│   │   │   ├── detect-bpm/         # BPM detection from images
│   │   │   ├── process-audio/      # Audio processing
│   │   │   ├── upload-audio/       # Audio file upload
│   │   │   └── create-sample/      # Sample generation
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Main application page
│   └── ...
├── .taskmaster/                    # Taskmaster configuration
├── baseline-heartbeat.wav          # Baseline audio file
└── uploads/                        # User uploaded files
```

## 🎵 Audio Processing

The application uses a real 8-second baby heartbeat audio file as the baseline and can:
- Adjust tempo to match detected BPM
- Create 3-second samples with whisper overlay
- Generate high-quality WAV output
- Support multiple audio formats (MP3, WAV, M4A)

## 📱 Social Features

- **Facebook Sharing**: Share with custom text and BPM information
- **Twitter Integration**: Tweet with hashtags and app branding
- **Instagram Support**: Copy link for stories and posts
- **Viral Content**: "Listen to my baby's heartbeat at [BPM] BPM! ❤️"

## 🔧 Development

### API Endpoints

- `POST /api/detect-bpm` - Detect BPM from ultrasound images
- `POST /api/process-audio` - Process audio with BPM adjustment
- `POST /api/upload-audio` - Handle audio file uploads
- `POST /api/create-sample` - Generate 3-second samples

### Environment Variables

Create a `.env.local` file with:
```env
# Add any required environment variables here
```

## 🚀 Deployment

The application is ready for deployment on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- Any Node.js hosting platform

## 📊 Project Management

This project uses Taskmaster AI for:
- Task tracking and management
- Progress monitoring
- Feature planning
- Development workflow optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the Taskmaster tasks for current development status

---

**Built with ❤️ for expecting parents everywhere**
