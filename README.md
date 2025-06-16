# MonoTone SFX

Web-based audio processing application that provides straightforward and efficient tools for audio manipulation. Built with React and Django, MonoTone SFX offers a clean, intuitive interface for audio editing and effects processing.

![site_image](schemes/site.png)

## Features

### Audio Processing
- Real-time waveform visualization
- 10-band equalizer with precise frequency control
- Master volume control with dB precision
- Variable playback speed with pitch-lock option
- High-quality audio export

### Technical Capabilities
- Support for various audio formats (MP3, WAV)
- Professional-grade audio processing using FFmpeg
- Responsive waveform display
- Real-time audio preview
- Efficient file handling and processing

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- FFmpeg (v4.0 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/monotone.git
cd monotone
```

2. Set up the frontend:
```bash
cd monotone-react
npm install
npm start
```

3. Set up the backend:
```bash
cd monotone-back
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

4. Configure FFmpeg:
   - Download FFmpeg from [official website](https://ffmpeg.org/download.html)
   - Add FFmpeg to your system PATH
   - Ensure FFmpeg is accessible from command line

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Upload an audio file using the LOAD button
3. Use the equalizer to adjust frequency bands
4. Control the master volume
5. Adjust playback speed with pitch-lock option
6. Preview changes in real-time
7. Save the processed audio file

## Project Structure

```
monotone/
├── monotone-react/     # Frontend React application
│   ├── src/           # Source files
│   └── public/        # Static files
│
└── monotone-back/     # Backend Django application
    ├── monotoneDjango/  # Django project
    └── requirements.txt # Python dependencies
```

## Technical Details

### Frontend
- React with TypeScript
- WaveSurfer.js for audio visualization
- Web Audio API for real-time processing
- Modern CSS for responsive design

### Backend
- Django REST framework
- FFmpeg for audio processing
- SQLite database
- File-based storage system

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
