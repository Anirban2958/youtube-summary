# 🎥 YouTube Video Summarizer

A beautiful, AI-powered web application that transforms YouTube videos into concise, intelligent summaries with advanced analytics and interactive features.

![YouTube Summarizer](https://img.shields.io/badge/YouTube-Summarizer-red?style=for-the-badge&logo=youtube)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.0+-green?style=for-the-badge&logo=flask)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)

## ✨ Features

### 🤖 AI-Powered Summarization
- **Smart Content Analysis**: Uses Google's Gemini AI for intelligent video summarization
- **Multiple Summary Styles**: Choose from bullet points, paragraphs, detailed analysis, and more
- **Language Support**: Supports multiple transcript languages and translation options
- **Customizable Length**: Short, medium, or detailed summaries based on your needs

### 📊 Advanced Analytics Dashboard
- **Word Statistics**: Total words, unique words, average word length
- **Reading Time**: Estimated reading and speaking time
- **Complexity Analysis**: Flesch-Kincaid readability score with visual meter
- **Video Efficiency**: Compression ratio and time saved compared to watching

### 🎯 Interactive Features
- **Mind Mapping**: Convert summaries into interactive D3.js mind maps
- **Voice Synthesis**: Listen to summaries with customizable voice controls
- **Q&A System**: Ask questions about the video content
- **Copy & Share**: Easy summary sharing and copying

### 🎨 Beautiful Modern UI
- **Glassmorphic Design**: Stunning translucent interface with backdrop blur
- **Responsive Layout**: Perfect on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Toggle between beautiful themes
- **Smooth Animations**: Fluid transitions and hover effects

### 📱 Progressive Web App (PWA)
- **Installable**: Add to home screen on any device
- **Offline Support**: Cache summaries for offline viewing
- **Background Sync**: Automatic updates when online
- **Native Feel**: App-like experience across platforms

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- YouTube Data API key (for video duration fetching)
- Google Gemini API key (for AI summarization)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/youtube-summarizer.git
   cd youtube-summarizer
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up API keys**
   ```bash
   # Copy the environment template
   cp .env.example .env
   ```
   
   - Get a [YouTube Data API key](https://developers.google.com/youtube/v3/getting-started)
   - Get a [Google Gemini API key](https://ai.google.dev/)
   - Open `.env` file and replace the placeholder values with your actual API keys:
   
   ```bash
   GOOGLE_API_KEY=your_actual_google_api_key_here
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
   
   **⚠️ Important**: Never commit your `.env` file to git! It's already included in `.gitignore`.

4. **Run the application**
   ```bash
   python main.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 🛠️ Usage

### Basic Usage
1. **Enter YouTube URL**: Paste any YouTube video URL
2. **Get Video Details**: Click to fetch available languages and video info
3. **Choose Options**: Select language, summary style, and detail level
4. **Generate Summary**: Click "Summarize" to get your AI-powered summary

### Advanced Features
- **Mind Map**: Toggle to view summary as an interactive mind map
- **Voice Controls**: Use text-to-speech with speed/pitch/volume controls
- **Analytics**: View detailed statistics about the video and summary
- **Q&A**: Ask specific questions about the video content

## 📁 Project Structure

```
youtube-summarizer/
├── main.py                 # Flask backend server
├── index.html             # Main HTML template
├── style.v2.css          # Modern CSS styling
├── script.simple.js      # Frontend JavaScript
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## 🔧 Configuration

### API Keys
Update these in `main.py`:
```python
# YouTube Data API key for video duration
YT_API_KEY = "your_youtube_api_key_here"

# Google Gemini API keys (multiple for fallback)
API_KEYS = [
    "your_gemini_api_key_1",
    "your_gemini_api_key_2",
    # Add more keys for better reliability
]
```

### Customization
- **Themes**: Modify CSS variables in `style.v2.css`
- **Summary Styles**: Add new styles in the `SUMMARY_STYLES` dict in `main.py`
- **Voice Options**: Customize voice settings in `script.simple.js`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful text summarization
- **YouTube Transcript API** for video transcript extraction
- **D3.js** for beautiful mind map visualizations
- **Inter Font** for clean, modern typography

## 📧 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🔮 Future Features

- [ ] Batch video processing
- [ ] Summary export to PDF/Word
- [ ] User accounts and saved summaries
- [ ] Video bookmark timestamps
- [ ] Collaborative summary editing
- [ ] API for third-party integration

---

<div align="center">
  <strong>Made with ❤️ for the YouTube community</strong>
</div>