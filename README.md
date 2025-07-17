# Mock Test Platform

🚀 **Live Demo:** [https://24kTanmay.github.io/test/](https://24kTanmay.github.io/test/)

A comprehensive web-based mock test platform with advanced proctoring features including webcam monitoring, screen recording, and anti-cheating measures.

## 🎯 Features

### Core Testing Features
- **⏱️ Timer System** - Real-time test duration tracking
- **💻 Code Editor** - Multi-language support (JavaScript, Python, Java, C++)
- **🔄 Code Execution** - Live code testing with output display
- **📝 Question Management** - Professional question presentation

### 🔒 Security & Anti-Cheating
- **🔍 Tab Switch Detection** - Monitors when users leave the test page
- **📋 Copy/Paste Prevention** - Blocks all copy/paste operations
- **⌨️ Keyboard Shortcut Blocking** - Prevents common cheating shortcuts
- **🖱️ Right-Click Disabled** - Context menu prevention
- **🛠️ Developer Tools Detection** - Blocks F12 and dev tools access
- **✏️ Text Selection Control** - Limited to code editor only

### 📹 Proctoring Features
- **📷 Webcam Monitoring** - Automatic snapshots every 10 seconds
- **🎥 Screen Recording** - Records current browser tab
- **🖥️ Fullscreen Enforcement** - Requires and monitors fullscreen mode
- **📊 Real-time Activity Logging** - Comprehensive violation tracking
- **🔐 Permission Management** - Handles webcam/screen access permissions

### � Monitoring Dashboard
- **📊 Live Statistics** - Tab switches, copy/paste attempts, snapshot count
- **🚦 Status Indicators** - Webcam, screen recording, fullscreen status
- **📋 Activity Log** - Real-time event logging with timestamps
- **⚠️ Violation Alerts** - Immediate warnings for suspicious behavior

## 🚀 Quick Start

### Option 1: Use GitHub Pages (Recommended)
Simply visit: **[https://24kTanmay.github.io/test/](https://24kTanmay.github.io/test/)**

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/24kTanmay/test.git
cd test

# Start local server
python -m http.server 8000

# Open in browser
http://localhost:8000
```

## 📱 Browser Compatibility

- ✅ **Chrome 80+** (Recommended)
- ✅ **Firefox 75+**
- ✅ **Edge 80+**
- ✅ **Safari 13+**

## 🛡️ Security Features

### Monitoring Capabilities
- **Tab Activity**: Detects tab switches and window focus changes
- **Input Monitoring**: Tracks copy/paste/cut operations
- **Keyboard Surveillance**: Monitors keyboard shortcuts and function keys
- **Visual Recording**: Webcam snapshots and screen recording
- **Fullscreen Compliance**: Enforces fullscreen mode throughout test

### Anti-Cheating Measures
- Disabled context menus and text selection
- Blocked developer tools access
- Prevented common keyboard shortcuts
- Real-time violation detection and logging
- Automatic warning system for suspicious activities

## 🔧 Technical Stack

- **HTML5** - Semantic structure and media APIs
- **CSS3** - Modern styling with glass-morphism design
- **Vanilla JavaScript** - ES6+ with class-based architecture
- **WebRTC APIs** - getUserMedia(), getDisplayMedia()
- **MediaRecorder API** - Video recording capabilities
- **Fullscreen API** - Cross-browser fullscreen management

## 📁 Project Structure

```
test/
├── index.html          # Main platform structure
├── styles.css          # Complete styling and animations
├── script.js           # Core JavaScript functionality
├── _config.yml         # GitHub Pages configuration
├── .gitignore          # Git ignore rules
└── README.md           # Documentation
```

## 🔐 Privacy & Data Handling

- 🔒 Webcam snapshots are stored locally during test session
- 🔒 Screen recordings remain in browser memory
- 🔒 No data is transmitted to external servers
- 🔒 All monitoring data is cleared after test completion
- 🔒 User privacy controls and permission management

## 📝 Usage Instructions

1. **🚀 Start Test** - Click "Start Test" button
2. **📷 Grant Permissions** - Allow webcam and screen recording access
3. **🖥️ Enter Fullscreen** - Required for comprehensive monitoring
4. **💻 Complete Test** - Answer questions and run code
5. **📊 End Test** - View detailed test summary and violations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues, questions, or contributions, please create an issue in the repository.

---

**⚠️ Note**: This platform is designed for educational and testing purposes. Ensure compliance with privacy laws and obtain proper consent before using webcam/screen recording features.
