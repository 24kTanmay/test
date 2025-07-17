class MockTestPlatform {
    constructor() {
        this.testActive = false;
        this.startTime = null;
        this.timerInterval = null;
        this.tabSwitchCount = 0;
        this.copyPasteCount = 0;
        this.activityLog = [];
        this.webcamStream = null;
        this.webcamActive = false;
        this.snapshotInterval = null;
        this.snapshotCount = 0;
        this.snapshots = [];
        this.screenStream = null;
        this.screenRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        this.initializeEventListeners();
        this.setupMonitoring();
        this.updateDisplay();
    }

    initializeEventListeners() {
        // Test control buttons
        const startBtn = document.getElementById('startTest');
        const endBtn = document.getElementById('endTest');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        if (startBtn) startBtn.addEventListener('click', () => this.startTest());
        if (endBtn) endBtn.addEventListener('click', () => this.endTest());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.enterFullscreen());
        
        // Webcam permission buttons
        const allowWebcam = document.getElementById('allowWebcam');
        const denyWebcam = document.getElementById('denyWebcam');
        
        if (allowWebcam) allowWebcam.addEventListener('click', () => this.handleWebcamPermission(true));
        if (denyWebcam) denyWebcam.addEventListener('click', () => this.handleWebcamPermission(false));
        
        // Screen recording permission buttons
        const allowScreen = document.getElementById('allowScreen');
        const denyScreen = document.getElementById('denyScreen');
        
        if (allowScreen) allowScreen.addEventListener('click', () => this.handleScreenPermission(true));
        if (denyScreen) denyScreen.addEventListener('click', () => this.handleScreenPermission(false));
        
        // Code execution
        const runCodeBtn = document.getElementById('runCode');
        if (runCodeBtn) runCodeBtn.addEventListener('click', () => this.runCode());
        
        // Warning acknowledgment
        const acknowledgeBtn = document.getElementById('acknowledgeWarning');
        if (acknowledgeBtn) acknowledgeBtn.addEventListener('click', () => this.hideWarning());
        
        // Language selector
        const languageSelect = document.getElementById('language');
        if (languageSelect) languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    }

    setupMonitoring() {
        // Tab switch detection
        document.addEventListener('visibilitychange', () => {
            if (this.testActive && document.hidden) {
                this.tabSwitchCount++;
                this.logActivity('Tab switch detected - User left the test page', 'warning');
                this.showWarning('Tab switching detected! This may be considered cheating.');
                this.updateDisplay();
            }
        });

        // Focus/blur detection for additional tab switch monitoring
        window.addEventListener('blur', () => {
            if (this.testActive) {
                this.logActivity('Window lost focus - Possible tab switch', 'warning');
            }
        });

        window.addEventListener('focus', () => {
            if (this.testActive) {
                this.logActivity('Window regained focus', 'info');
            }
        });

        // Copy-paste detection and prevention
        document.addEventListener('copy', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.copyPasteCount++;
                this.logActivity('Copy operation blocked', 'warning');
                this.showWarning('Copy operation is not allowed during the test!');
                this.updateDisplay();
                return false;
            }
        });

        document.addEventListener('paste', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.copyPasteCount++;
                this.logActivity('Paste operation blocked', 'warning');
                this.showWarning('Paste operation is not allowed during the test!');
                this.updateDisplay();
                return false;
            }
        });

        // Additional copy prevention
        document.addEventListener('cut', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.copyPasteCount++;
                this.logActivity('Cut operation blocked', 'warning');
                this.showWarning('Cut operation is not allowed during the test!');
                this.updateDisplay();
                return false;
            }
        });

        // Prevent text selection during test
        document.addEventListener('selectstart', (e) => {
            if (this.testActive && e.target.id !== 'codeEditor') {
                e.preventDefault();
                return false;
            }
        });

        // Prevent drag and drop
        document.addEventListener('dragstart', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.logActivity('Drag operation blocked', 'warning');
                return false;
            }
        });

        // Keyboard shortcuts monitoring and prevention
        document.addEventListener('keydown', (e) => {
            if (this.testActive) {
                // Detect and block common shortcuts
                if (e.ctrlKey || e.metaKey) {
                    const key = e.key.toLowerCase();
                    if (['c', 'v', 'x', 'a'].includes(key)) {
                        e.preventDefault();
                        this.logActivity(`Blocked keyboard shortcut: Ctrl+${key.toUpperCase()}`, 'warning');
                        this.showWarning(`Keyboard shortcut Ctrl+${key.toUpperCase()} is not allowed during the test!`);
                        return false;
                    }
                    if (key === 't') {
                        e.preventDefault();
                        this.showWarning('Opening new tabs is not allowed during the test!');
                        this.logActivity('Attempted to open new tab (Ctrl+T)', 'warning');
                        return false;
                    }
                    if (key === 'w') {
                        e.preventDefault();
                        this.showWarning('Closing tabs is not allowed during the test!');
                        this.logActivity('Attempted to close tab (Ctrl+W)', 'warning');
                        return false;
                    }
                }
                
                // F12 (Developer Tools)
                if (e.key === 'F12') {
                    e.preventDefault();
                    this.showWarning('Developer tools are not allowed during the test!');
                    this.logActivity('Attempted to open developer tools (F12)', 'warning');
                    return false;
                }
                
                // Print Screen detection and prevention
                if (e.key === 'PrintScreen' || e.keyCode === 44 || e.which === 44) {
                    e.preventDefault();
                    this.copyPasteCount++; // Count as violation
                    this.showWarning('Screenshots are not allowed during the test! This violation has been recorded.');
                    this.logActivity('Print Screen key pressed - Screenshot attempt blocked', 'warning');
                    this.updateDisplay();
                    return false;
                }
                
                // Alt+Print Screen (Alt+PrtScn)
                if (e.altKey && (e.key === 'PrintScreen' || e.keyCode === 44 || e.which === 44)) {
                    e.preventDefault();
                    this.copyPasteCount++;
                    this.showWarning('Alt+Print Screen is not allowed during the test! Active window screenshots are blocked.');
                    this.logActivity('Alt+Print Screen pressed - Window screenshot attempt blocked', 'warning');
                    this.updateDisplay();
                    return false;
                }
                
                // Windows+Print Screen (Win+PrtScn)
                if ((e.metaKey || e.key === 'Meta') && (e.key === 'PrintScreen' || e.keyCode === 44 || e.which === 44)) {
                    e.preventDefault();
                    this.copyPasteCount++;
                    this.showWarning('Windows+Print Screen is not allowed during the test! Screenshot to clipboard blocked.');
                    this.logActivity('Windows+Print Screen pressed - System screenshot attempt blocked', 'warning');
                    this.updateDisplay();
                    return false;
                }
                
                // Ctrl+Print Screen
                if (e.ctrlKey && (e.key === 'PrintScreen' || e.keyCode === 44 || e.which === 44)) {
                    e.preventDefault();
                    this.copyPasteCount++;
                    this.showWarning('Ctrl+Print Screen is not allowed during the test!');
                    this.logActivity('Ctrl+Print Screen pressed - Screenshot attempt blocked', 'warning');
                    this.updateDisplay();
                    return false;
                }
                
                // Windows Key (Super/Meta key) detection
                if (e.key === 'Meta' || e.keyCode === 91 || e.keyCode === 92) {
                    this.logActivity('Windows key pressed - Possible system access attempt', 'warning');
                    this.showWarning('System shortcuts may interfere with the test. Please avoid using Windows key during the test.');
                }
                
                // Alt+Tab
                if (e.altKey && e.key === 'Tab') {
                    this.logActivity('Alt+Tab detected - Possible application switching', 'warning');
                    this.showWarning('Alt+Tab detected! Application switching may be considered a violation.');
                }
                
                // Ctrl+Shift combinations (screenshot tools)
                if (e.ctrlKey && e.shiftKey) {
                    const key = e.key.toLowerCase();
                    if (['s', 'x'].includes(key)) {
                        e.preventDefault();
                        this.copyPasteCount++;
                        this.showWarning(`Ctrl+Shift+${key.toUpperCase()} is blocked - Potential screenshot tool shortcut!`);
                        this.logActivity(`Ctrl+Shift+${key.toUpperCase()} blocked - Screenshot tool attempt`, 'warning');
                        this.updateDisplay();
                        return false;
                    }
                }
            }
        });

        // Right-click context menu prevention
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.testActive) {
                this.showWarning('Right-click context menu is disabled during the test!');
                this.logActivity('Right-click context menu attempted', 'warning');
            }
            return false;
        });

        // Browser back/forward prevention
        window.addEventListener('beforeunload', (e) => {
            if (this.testActive) {
                e.preventDefault();
                e.returnValue = 'Test is in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Fullscreen monitoring
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenStatus();
            if (this.testActive && !this.isFullscreen()) {
                this.logActivity('Fullscreen mode exited - Violation detected', 'warning');
                this.showWarning('Fullscreen mode is required during the test! Please return to fullscreen by pressing F11 or clicking "I Understand" to re-enter automatically.', () => {
                    this.enterFullscreen();
                });
            }
        });

        // Also monitor other fullscreen events for cross-browser compatibility
        document.addEventListener('webkitfullscreenchange', () => {
            this.updateFullscreenStatus();
            if (this.testActive && !this.isFullscreen()) {
                this.logActivity('Fullscreen mode exited (webkit)', 'warning');
                this.showWarning('Fullscreen mode is required during the test! Please return to fullscreen.', () => {
                    this.enterFullscreen();
                });
            }
        });
        
        document.addEventListener('mozfullscreenchange', () => {
            this.updateFullscreenStatus();
            if (this.testActive && !this.isFullscreen()) {
                this.logActivity('Fullscreen mode exited (moz)', 'warning');
                this.showWarning('Fullscreen mode is required during the test! Please return to fullscreen.', () => {
                    this.enterFullscreen();
                });
            }
        });
        
        document.addEventListener('msfullscreenchange', () => {
            this.updateFullscreenStatus();
        });

        // ESC key prevention (exits fullscreen)
        document.addEventListener('keydown', (e) => {
            if (this.testActive && e.key === 'Escape') {
                e.preventDefault();
                this.logActivity('ESC key blocked - Fullscreen protection', 'warning');
                this.showWarning('ESC key is disabled during the test to maintain fullscreen mode!');
                return false;
            }
        });

        // Additional screenshot detection methods
        this.setupScreenshotDetection();
        
        // Monitor clipboard access attempts
        this.setupClipboardMonitoring();
    }

    setupScreenshotDetection() {
        // Monitor for common screenshot applications
        document.addEventListener('keyup', (e) => {
            if (this.testActive) {
                // Snipping Tool shortcuts
                if ((e.key === 'Meta' || e.metaKey) && e.shiftKey && e.key === 'S') {
                    this.copyPasteCount++;
                    this.showWarning('Windows+Shift+S (Snipping Tool) is not allowed during the test!');
                    this.logActivity('Snipping Tool shortcut detected - Screenshot attempt blocked', 'warning');
                    this.updateDisplay();
                }
                
                // Function keys that might trigger screenshot tools
                if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'].includes(e.key)) {
                    if (e.key === 'F11') {
                        e.preventDefault();
                        this.logActivity('F11 key blocked during test', 'warning');
                        this.showWarning('Manual fullscreen toggle (F11) is disabled during the test!');
                        return false;
                    }
                    this.logActivity(`Function key ${e.key} pressed - Monitoring for screenshot tools`, 'info');
                }
            }
        });

        // Monitor for screen capture API access
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
            navigator.mediaDevices.getDisplayMedia = (...args) => {
                if (this.testActive && !this.screenRecording) {
                    this.logActivity('Unauthorized screen capture attempt detected', 'warning');
                    this.showWarning('Unauthorized screen recording attempt detected! Only test-approved recording is allowed.');
                    throw new Error('Screen capture not allowed during test');
                }
                return originalGetDisplayMedia.apply(navigator.mediaDevices, args);
            };
        }

        // Monitor window visibility changes (potential screenshot tools)
        let visibilityChangeCount = 0;
        document.addEventListener('visibilitychange', () => {
            if (this.testActive && document.hidden) {
                visibilityChangeCount++;
                if (visibilityChangeCount > 3) {
                    this.logActivity('Multiple tab switches detected - Possible screenshot tool usage', 'warning');
                    this.showWarning('Multiple tab switches detected. Excessive switching may indicate screenshot tool usage.');
                }
            }
        });

        // Additional screenshot detection methods
        setInterval(() => {
            if (window.mockTestPlatform && window.mockTestPlatform.testActive) {
                // Monitor for rapid window size changes (screenshot tool behavior)
                const currentSize = `${window.innerWidth}x${window.innerHeight}`;
                if (window.lastWindowSize && window.lastWindowSize !== currentSize) {
                    const sizeChangeCount = (window.sizeChangeCount || 0) + 1;
                    window.sizeChangeCount = sizeChangeCount;
                    
                    if (sizeChangeCount > 5) {
                        window.mockTestPlatform.logActivity('Rapid window size changes detected - Possible screenshot tool', 'warning');
                        window.mockTestPlatform.showWarning('Unusual window behavior detected. Please avoid resizing the window during the test.');
                        window.sizeChangeCount = 0; // Reset counter
                    }
                }
                window.lastWindowSize = currentSize;

                // Monitor for external applications accessing the screen
                if (document.hasFocus && !document.hasFocus()) {
                    const focusLossCount = (window.focusLossCount || 0) + 1;
                    window.focusLossCount = focusLossCount;
                    
                    if (focusLossCount > 10) {
                        window.mockTestPlatform.logActivity('Excessive focus loss detected - Possible external tool usage', 'warning');
                        window.mockTestPlatform.showWarning('Multiple window focus changes detected. External applications may interfere with test integrity.');
                        window.focusLossCount = 0; // Reset counter
                    }
                }
            }
        }, 1000);

        // Monitor for screenshot-related browser events
        document.addEventListener('DOMContentLoaded', () => {
            // Detect if user tries to save page content
            document.addEventListener('keydown', (e) => {
                if (window.mockTestPlatform && window.mockTestPlatform.testActive) {
                    // Ctrl+S (Save page)
                    if (e.ctrlKey && e.key === 's') {
                        e.preventDefault();
                        window.mockTestPlatform.copyPasteCount++;
                        window.mockTestPlatform.showWarning('Saving page content is not allowed during the test!');
                        window.mockTestPlatform.logActivity('Attempted to save page (Ctrl+S)', 'warning');
                        window.mockTestPlatform.updateDisplay();
                        return false;
                    }
                    
                    // Ctrl+P (Print page)
                    if (e.ctrlKey && e.key === 'p') {
                        e.preventDefault();
                        window.mockTestPlatform.copyPasteCount++;
                        window.mockTestPlatform.showWarning('Printing is not allowed during the test!');
                        window.mockTestPlatform.logActivity('Attempted to print page (Ctrl+P)', 'warning');
                        window.mockTestPlatform.updateDisplay();
                        return false;
                    }
                }
            });

            // Monitor for browser's built-in screenshot functionality
            if ('getDisplayMedia' in navigator.mediaDevices) {
                const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
                navigator.mediaDevices.getDisplayMedia = function(...args) {
                    if (window.mockTestPlatform && window.mockTestPlatform.testActive && !window.mockTestPlatform.screenRecording) {
                        window.mockTestPlatform.logActivity('Unauthorized screen capture API call detected', 'warning');
                        window.mockTestPlatform.showWarning('Unauthorized screen recording detected! This is a serious violation.');
                        throw new Error('Screen capture blocked during test');
                    }
                    return originalGetDisplayMedia.apply(this, args);
                };
            }
        });

        // Prevent common screenshot shortcuts with additional methods
        window.addEventListener('keydown', (e) => {
            if (window.mockTestPlatform && window.mockTestPlatform.testActive) {
                // Lightshot and other screenshot tool shortcuts
                const screenshotShortcuts = [
                    { ctrl: true, shift: false, alt: false, key: 'PrintScreen' },
                    { ctrl: false, shift: true, alt: false, key: 'PrintScreen' },
                    { ctrl: true, shift: true, alt: false, key: 'PrintScreen' },
                    { ctrl: false, shift: false, alt: true, key: 'PrintScreen' },
                    // Common third-party screenshot tools
                    { ctrl: true, shift: true, alt: false, key: 'x' }, // Some screenshot tools
                    { ctrl: true, shift: true, alt: false, key: 'z' }, // Some screenshot tools
                ];

                for (const shortcut of screenshotShortcuts) {
                    if (e.ctrlKey === shortcut.ctrl && 
                        e.shiftKey === shortcut.shift && 
                        e.altKey === shortcut.alt && 
                        e.key === shortcut.key) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.mockTestPlatform.copyPasteCount++;
                        window.mockTestPlatform.showWarning(`Screenshot shortcut ${shortcut.ctrl ? 'Ctrl+' : ''}${shortcut.shift ? 'Shift+' : ''}${shortcut.alt ? 'Alt+' : ''}${shortcut.key} is blocked!`);
                        window.mockTestPlatform.logActivity(`Screenshot shortcut attempt: ${shortcut.ctrl ? 'Ctrl+' : ''}${shortcut.shift ? 'Shift+' : ''}${shortcut.alt ? 'Alt+' : ''}${shortcut.key}`, 'warning');
                        window.mockTestPlatform.updateDisplay();
                        return false;
                    }
                }
            }
        }, true); // Use capture phase to catch events early
    }

    startTest() {
        // First request webcam permission
        this.requestWebcamPermission();
    }

    requestWebcamPermission() {
        const permissionOverlay = document.getElementById('permissionOverlay');
        if (permissionOverlay) permissionOverlay.style.display = 'flex';
        this.logActivity('Requesting webcam permission for proctoring', 'info');
    }

    handleWebcamPermission(granted) {
        const permissionOverlay = document.getElementById('permissionOverlay');
        if (permissionOverlay) permissionOverlay.style.display = 'none';
        
        if (granted) {
            this.initializeWebcam().then(() => {
                this.requestScreenPermission();
            }).catch((error) => {
                this.logActivity('Webcam initialization failed: ' + error.message, 'warning');
                this.showWarning('Webcam access failed. Proceeding to screen recording request.');
                this.requestScreenPermission();
            });
        } else {
            this.logActivity('Webcam permission denied by user', 'warning');
            this.requestScreenPermission();
        }
    }

    requestScreenPermission() {
        const screenPermissionOverlay = document.getElementById('screenPermissionOverlay');
        if (screenPermissionOverlay) screenPermissionOverlay.style.display = 'flex';
        this.logActivity('Requesting screen recording permission', 'info');
    }

    handleScreenPermission(granted) {
        const screenPermissionOverlay = document.getElementById('screenPermissionOverlay');
        if (screenPermissionOverlay) screenPermissionOverlay.style.display = 'none';
        
        if (granted) {
            this.initializeScreenRecording().then(() => {
                this.proceedWithTest();
            }).catch((error) => {
                this.logActivity('Screen recording initialization failed: ' + error.message, 'warning');
                this.showWarning('Screen recording access failed. Test will continue without screen monitoring.');
                this.proceedWithTest();
            });
        } else {
            this.logActivity('Screen recording permission denied by user', 'warning');
            this.showWarning('Screen recording access denied. Test will continue with limited monitoring.');
            this.proceedWithTest();
        }
    }

    async initializeWebcam() {
        try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'user'
                } 
            });
            
            const video = document.getElementById('webcamVideo');
            video.srcObject = this.webcamStream;
            document.getElementById('webcamContainer').style.display = 'block';
            
            this.webcamActive = true;
            this.updateWebcamStatus();
            this.logActivity('Webcam initialized successfully', 'info');
            
            // Add recording indicator
            this.addWebcamIndicator();
            
        } catch (error) {
            throw new Error('Failed to access webcam: ' + error.message);
        }
    }

    addWebcamIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'webcamIndicator';
        indicator.className = 'webcam-indicator';
        indicator.innerHTML = '🔴 RECORDING';
        document.body.appendChild(indicator);
    }

    async initializeScreenRecording() {
        try {
            // Try to capture current tab first (Chrome/Edge)
            try {
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        mediaSource: 'browser',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 10 }
                    },
                    audio: false,
                    preferCurrentTab: true
                });
            } catch (tabError) {
                // Fallback to screen capture if tab capture fails
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 10 }
                    },
                    audio: false
                });
            }

            // Auto-select current tab/window programmatically
            const tracks = this.screenStream.getVideoTracks();
            if (tracks.length > 0) {
                // Apply constraints to focus on current tab
                await tracks[0].applyConstraints({
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 10 }
                });
            }

            // Set up MediaRecorder with optimized settings
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(this.screenStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.finalizeRecording();
            };

            // Handle stream ending (user stops sharing)
            this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.logActivity('Screen recording ended - User stopped sharing', 'warning');
                this.screenRecording = false;
                this.updateScreenStatus();
                if (this.testActive) {
                    this.showWarning('Screen recording stopped! This is considered a violation. Test will be flagged.');
                }
            });

            this.screenRecording = true;
            this.updateScreenStatus();
            this.logActivity('Screen recording initialized - Current tab/window being recorded', 'info');
            
            // Add screen recording indicator
            this.addScreenIndicator();

        } catch (error) {
            throw new Error('Failed to access screen recording: ' + error.message);
        }
    }

    addScreenIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'screenIndicator';
        indicator.className = 'screen-indicator';
        indicator.innerHTML = '📹 RECORDING THIS TAB';
        document.body.appendChild(indicator);
    }

    proceedWithTest() {
        this.testActive = true;
        this.startTime = new Date();
        this.tabSwitchCount = 0;
        this.copyPasteCount = 0;
        this.snapshotCount = 0;
        this.activityLog = [];
        
        // Update UI elements safely
        const startBtn = document.getElementById('startTest');
        const endBtn = document.getElementById('endTest');
        const testStatus = document.getElementById('testStatus');
        
        if (startBtn) startBtn.disabled = true;
        if (endBtn) endBtn.disabled = false;
        if (testStatus) {
            testStatus.textContent = 'In Progress';
            testStatus.style.color = '#e53e3e';
        }
        
        // Start timer
        this.startTimer();
        
        // Start webcam monitoring if available
        if (this.webcamActive) {
            this.startWebcamMonitoring();
        }

        // Start screen recording if available
        if (this.screenRecording) {
            this.startScreenRecording();
        }
        
        // Log start
        this.logActivity('Test started - Attempting to enter fullscreen mode', 'info');
        this.updateDisplay();
        
        // Show initial instructions and request fullscreen
        this.showWarning('Test is starting! Click "I Understand" to enter fullscreen mode and begin monitoring.', () => {
            this.enterFullscreen();
        });
    }

    endTest() {
        this.testActive = false;
        
        // Stop webcam monitoring
        this.stopWebcamMonitoring();

        // Stop screen recording
        this.stopScreenRecording();
        
        // Exit fullscreen mode
        this.exitFullscreen();
        
        // Update UI safely
        const startBtn = document.getElementById('startTest');
        const endBtn = document.getElementById('endTest');
        const testStatus = document.getElementById('testStatus');
        
        if (startBtn) startBtn.disabled = false;
        if (endBtn) endBtn.disabled = true;
        if (testStatus) {
            testStatus.textContent = 'Completed';
            testStatus.style.color = '#38a169';
        }
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Log end and show summary
        this.logActivity('Test ended - Stopping all monitoring', 'info');
        this.showTestSummary();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now - this.startTime) / 1000);
            
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;
            
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const timerElement = document.getElementById('timer');
            if (timerElement) timerElement.textContent = timeString;
        }, 1000);
    }

    showTestSummary() {
        const elapsed = this.startTime ? Math.floor((new Date() - this.startTime) / 1000) : 0;
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const summary = `Test Summary:
Time taken: ${minutes}m ${seconds}s
Tab switches: ${this.tabSwitchCount}
Copy/Paste events: ${this.copyPasteCount}
Webcam snapshots: ${this.snapshotCount}
Screen recording: ${this.screenRecording ? 'Completed' : 'Not available'}
Total violations: ${this.tabSwitchCount + this.copyPasteCount}`;
        
        this.showWarning(summary);
    }

    runCode() {
        const code = document.getElementById('codeEditor').value;
        const language = document.getElementById('language').value;
        const output = document.getElementById('output');
        
        if (!code.trim()) {
            output.innerHTML = '<span style="color: #f56565;">Error: No code to execute</span>';
            return;
        }
        
        this.logActivity(`Code execution attempted in ${language}`, 'info');
        
        try {
            if (language === 'javascript') {
                this.executeJavaScript(code, output);
            } else {
                output.innerHTML = `<span style="color: #ed8936;">Simulated output for ${language}:</span>\n\n${this.simulateExecution(code, language)}`;
            }
        } catch (error) {
            output.innerHTML = `<span style="color: #f56565;">Error:</span> ${error.message}`;
        }
    }

    executeJavaScript(code, output) {
        // Create a safe execution environment
        const originalConsole = console.log;
        let consoleOutput = [];
        
        // Override console.log to capture output
        console.log = (...args) => {
            consoleOutput.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
        };
        
        try {
            // Execute the code
            const result = eval(code);
            
            // Test the function if it exists
            if (typeof sumEvenNumbers === 'function') {
                const testCases = [
                    [1, 2, 3, 4, 5, 6],
                    [1, 3, 5],
                    [2, 4, 6, 8],
                    [],
                    [0, -2, 4, -6]
                ];
                
                consoleOutput.push('\n=== Running Test Cases ===');
                testCases.forEach((testCase, index) => {
                    try {
                        const result = sumEvenNumbers(testCase);
                        consoleOutput.push(`Test ${index + 1}: sumEvenNumbers([${testCase.join(', ')}]) = ${result}`);
                    } catch (error) {
                        consoleOutput.push(`Test ${index + 1}: Error - ${error.message}`);
                    }
                });
            }
            
            if (consoleOutput.length === 0 && result !== undefined) {
                consoleOutput.push(String(result));
            }
            
            output.innerHTML = consoleOutput.length > 0 ? 
                `<span style="color: #68d391;">Output:</span>\n${consoleOutput.join('\n')}` :
                '<span style="color: #68d391;">Code executed successfully (no output)</span>';
                
        } catch (error) {
            output.innerHTML = `<span style="color: #f56565;">Error:</span> ${error.message}`;
        } finally {
            // Restore original console.log
            console.log = originalConsole;
        }
    }

    simulateExecution(code, language) {
        const templates = {
            python: `Running Python code...
> python script.py
Output: [Simulated execution]
Process finished with exit code 0`,
            
            java: `Compiling Java code...
> javac Solution.java
> java Solution
Output: [Simulated execution]
Build successful`,
            
            cpp: `Compiling C++ code...
> g++ -o solution solution.cpp
> ./solution
Output: [Simulated execution]
Process finished with exit code 0`
        };
        
        return templates[language] || 'Code execution simulated for ' + language;
    }

    changeLanguage(language) {
        const codeEditor = document.getElementById('codeEditor');
        const templates = {
            javascript: `function sumEvenNumbers(arr) {
    // Write your solution here
    
}`,
            python: `def sum_even_numbers(arr):
    # Write your solution here
    pass`,
            java: `public class Solution {
    public static int sumEvenNumbers(int[] arr) {
        // Write your solution here
        return 0;
    }
}`,
            cpp: `#include <vector>
using namespace std;

int sumEvenNumbers(vector<int>& arr) {
    // Write your solution here
    return 0;
}`
        };
        
        codeEditor.value = templates[language] || '// Write your code here';
        this.logActivity(`Language changed to ${language}`, 'info');
    }

    logActivity(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.activityLog.push({ message, type, timestamp });
        this.updateActivityLog();
    }

    updateActivityLog() {
        const logContainer = document.getElementById('activityLog');
        
        if (this.activityLog.length === 0) {
            logContainer.innerHTML = '<p class="log-placeholder">Activity will be logged here during the test...</p>';
            return;
        }
        
        const logEntries = this.activityLog.slice(-10).map(entry => `
            <div class="log-entry ${entry.type}">
                <span>${entry.message}</span>
                <span class="log-timestamp">${entry.timestamp}</span>
            </div>
        `).join('');
        
        logContainer.innerHTML = logEntries;
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    updateDisplay() {
        const tabSwitchElement = document.getElementById('tabSwitchCount');
        const copyPasteElement = document.getElementById('copyPasteCount');
        const snapshotElement = document.getElementById('snapshotCount');
        
        if (tabSwitchElement) tabSwitchElement.textContent = this.tabSwitchCount;
        if (copyPasteElement) copyPasteElement.textContent = this.copyPasteCount;
        if (snapshotElement) snapshotElement.textContent = this.snapshotCount;
        
        this.updateFullscreenStatus();
        this.updateWebcamStatus();
        this.updateScreenStatus();
    }

    updateScreenStatus() {
        const screenStatusElement = document.getElementById('screenStatus');
        if (screenStatusElement) {
            if (this.screenRecording && this.testActive) {
                screenStatusElement.textContent = 'Recording Tab';
                screenStatusElement.style.color = '#e53e3e';
            } else {
                screenStatusElement.textContent = 'Inactive';
                screenStatusElement.style.color = '#4a5568';
            }
        }
    }

    updateWebcamStatus() {
        const webcamStatusElement = document.getElementById('webcamStatus');
        if (webcamStatusElement) {
            if (this.webcamActive && this.testActive) {
                webcamStatusElement.textContent = 'Active';
                webcamStatusElement.style.color = '#38a169';
            } else {
                webcamStatusElement.textContent = 'Inactive';
                webcamStatusElement.style.color = '#4a5568';
            }
        }
    }

    updateFullscreenStatus() {
        const fullscreenStatusElement = document.getElementById('fullscreenStatus');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        
        if (fullscreenStatusElement) {
            if (this.isFullscreen()) {
                fullscreenStatusElement.textContent = 'Active';
                fullscreenStatusElement.style.color = '#38a169';
                if (fullscreenBtn) fullscreenBtn.style.display = 'none';
            } else {
                fullscreenStatusElement.textContent = 'Inactive';
                fullscreenStatusElement.style.color = this.testActive ? '#e53e3e' : '#4a5568';
                if (this.testActive && fullscreenBtn) {
                    fullscreenBtn.style.display = 'flex';
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Enter Fullscreen';
                }
            }
        }
    }

    showWarning(message, callback = null) {
        const warningMessage = document.getElementById('warningMessage');
        const warningOverlay = document.getElementById('warningOverlay');
        
        if (warningMessage) warningMessage.textContent = message;
        if (warningOverlay) warningOverlay.classList.add('show');
        
        // Store callback for acknowledgment
        this.warningCallback = callback;
    }

    hideWarning() {
        const warningOverlay = document.getElementById('warningOverlay');
        if (warningOverlay) warningOverlay.classList.remove('show');
        
        // Execute callback if provided
        if (this.warningCallback) {
            this.warningCallback();
            this.warningCallback = null;
        }
    }

    enterFullscreen() {
        const element = document.documentElement;
        
        const requestFullscreen = () => {
            if (element.requestFullscreen) {
                return element.requestFullscreen();
            } else if (element.mozRequestFullScreen) { // Firefox
                return element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) { // Chrome, Safari, Opera
                return element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { // IE/Edge
                return element.msRequestFullscreen();
            } else {
                throw new Error('Fullscreen API not supported');
            }
        };

        requestFullscreen()
            .then(() => {
                this.logActivity('Successfully entered fullscreen mode', 'info');
                this.updateFullscreenStatus();
            })
            .catch(err => {
                console.error('Fullscreen error:', err);
                this.logActivity('Failed to enter fullscreen mode - ' + err.message, 'warning');
                this.showWarning('Unable to enter fullscreen mode automatically. Please press F11 to enter fullscreen manually, or allow fullscreen when prompted by your browser.');
            });
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }

    isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.mozFullScreenElement || 
                 document.webkitFullscreenElement || 
                 document.msFullscreenElement ||
                 window.innerHeight === screen.height); // Fallback check
    }

    startWebcamMonitoring() {
        if (!this.webcamActive) return;
        
        this.logActivity('Starting webcam monitoring - snapshots every 10 seconds', 'info');
        
        // Take first snapshot immediately
        this.takeSnapshot();
        
        // Set up interval for periodic snapshots
        this.snapshotInterval = setInterval(() => {
            if (this.testActive) {
                this.takeSnapshot();
            }
        }, 10000); // 10 seconds
        
        // Add visual indicator
        const video = document.getElementById('webcamVideo');
        video.classList.add('recording');
    }

    stopWebcamMonitoring() {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }
        
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
        
        this.webcamActive = false;
        
        // Hide webcam elements
        document.getElementById('webcamContainer').style.display = 'none';
        
        // Remove indicator
        const indicator = document.getElementById('webcamIndicator');
        if (indicator) {
            indicator.remove();
        }
        
        this.updateWebcamStatus();
        this.logActivity('Webcam monitoring stopped', 'info');
    }

    startScreenRecording() {
        if (!this.screenRecording || !this.mediaRecorder) return;
        
        this.logActivity('Starting screen recording', 'info');
        
        // Start recording
        this.mediaRecorder.start(1000); // Record in 1-second chunks
        
        this.updateScreenStatus();
    }

    stopScreenRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        this.screenRecording = false;
        
        // Remove indicator
        const screenIndicator = document.getElementById('screenIndicator');
        if (screenIndicator) {
            screenIndicator.remove();
        }
        
        this.updateScreenStatus();
        this.logActivity('Screen recording stopped', 'info');
    }

    finalizeRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Store recording reference
        const recording = {
            timestamp: new Date().toISOString(),
            duration: this.startTime ? Math.floor((new Date() - this.startTime) / 1000) : 0,
            size: blob.size,
            url: url,
            blob: blob
        };
        
        this.screenRecording = recording;
        this.logActivity(`Screen recording completed - ${(blob.size / (1024 * 1024)).toFixed(2)} MB`, 'info');
        
        // Optional: Auto-download the recording
        // this.downloadRecording(recording);
    }

    downloadRecording(recording) {
        const a = document.createElement('a');
        a.href = recording.url;
        a.download = `test-screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.logActivity('Screen recording downloaded', 'info');
    }

    takeSnapshot() {
        if (!this.webcamActive || !this.testActive) return;
        
        const video = document.getElementById('webcamVideo');
        const canvas = document.getElementById('snapshotCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Store snapshot with timestamp
        const snapshot = {
            timestamp: new Date().toISOString(),
            dataUrl: imageData,
            testTime: Math.floor((new Date() - this.startTime) / 1000)
        };
        
        this.snapshots.push(snapshot);
        this.snapshotCount++;
        
        this.logActivity(`Webcam snapshot captured (#${this.snapshotCount})`, 'info');
        this.updateDisplay();
        
        // Optional: Limit stored snapshots to prevent memory issues
        if (this.snapshots.length > 50) {
            this.snapshots.shift(); // Remove oldest snapshot
        }
    }

    getSnapshotsSummary() {
        return {
            count: this.snapshotCount,
            timestamps: this.snapshots.map(s => s.timestamp),
            totalSize: this.snapshots.reduce((size, s) => size + s.dataUrl.length, 0)
        };
    }

    exportSnapshots() {
        // This function could be used to export snapshots for review
        const summaryData = {
            testSession: {
                startTime: this.startTime,
                endTime: new Date(),
                totalSnapshots: this.snapshotCount,
                violations: {
                    tabSwitches: this.tabSwitchCount,
                    copyPaste: this.copyPasteCount
                }
            },
            snapshots: this.snapshots.map(s => ({
                timestamp: s.timestamp,
                testTime: s.testTime
                // Note: In a real implementation, you might want to store images separately
                // and only include references here due to size constraints
            }))
        };
        
        return summaryData;
    }
}

// Initialize the platform when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mockTestPlatform = new MockTestPlatform();
    
    // Initial fullscreen status update
    setInterval(() => {
        if (window.mockTestPlatform) {
            window.mockTestPlatform.updateFullscreenStatus();
        }
    }, 1000);
    
    // Add some sample keyboard shortcuts info
    console.log('Mock Test Platform Loaded');
    console.log('Monitoring features:');
    console.log('- Tab switching detection');
    console.log('- Copy/paste detection');
    console.log('- Keyboard shortcut monitoring');
    console.log('- Right-click prevention');
    console.log('- Developer tools prevention');
    console.log('- Fullscreen enforcement');
});

// Prevent common cheating methods
document.addEventListener('keydown', (e) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+U, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['u', 'c', 'v', 'x', 'a'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        return false;
    }
    
    // Prevent F11 during test (manual fullscreen toggle)
    if (window.mockTestPlatform && window.mockTestPlatform.testActive && e.key === 'F11') {
        e.preventDefault();
        window.mockTestPlatform.logActivity('F11 key blocked during test', 'warning');
        window.mockTestPlatform.showWarning('Manual fullscreen toggle (F11) is disabled during the test!');
        return false;
    }
});

// Disable right-click globally
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Disable text selection globally except in code editor
document.addEventListener('selectstart', (e) => {
    if (e.target.id !== 'codeEditor') {
        e.preventDefault();
        return false;
    }
});

// Disable drag and drop globally
document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
});

// Additional protection against developer tools
let devtools = {
    open: false,
    orientation: null
};

const threshold = 160;

setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
            devtools.open = true;
            if (window.mockTestPlatform && window.mockTestPlatform.testActive) {
                window.mockTestPlatform.showWarning('Developer tools detected! This is not allowed during the test.');
                window.mockTestPlatform.logActivity('Developer tools opened', 'warning');
            }
        }
    } else {
        devtools.open = false;
    }
}, 500);
