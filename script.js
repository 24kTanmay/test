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
        
        // Mouse tracking properties
        this.mouseTracking = {
            lastActivity: Date.now(),
            idleTimeoutDuration: 30000, // 30 seconds
            idleWarningDuration: 20000, // 20 seconds warning
            idleInterval: null,
            isIdle: false,
            totalIdleTime: 0,
            idleSessionStart: null,
            
            // Mouse position tracking
            lastPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            totalDistance: 0,
            movementHistory: [],
            maxHistoryLength: 100,
            
            // Mouse boundary tracking
            leftBrowser: false,
            browserExitCount: 0,
            browserExitTime: 0,
            
            // Anomaly detection
            jumpThreshold: 150, // pixels
            jumpCount: 0,
            accelerationThreshold: 50, // pixels per millisecond
            highAccelerationCount: 0,
            suspiciousMovementCount: 0,
            
            // Coverage area
            visitedAreas: new Set(),
            gridSize: 50, // 50x50 pixel grids
            totalCoverage: 0
        };
        
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
                
                // Enhanced Print Screen detection and prevention
                this.detectScreenshotKeycodes(e);
                
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

        // Additional Print Screen detection on keyup event
        document.addEventListener('keyup', (e) => {
            if (this.testActive) {
                // Print Screen detection on keyup (sometimes keydown doesn't catch it)
                this.detectScreenshotKeycodes(e);
                
                // Enhanced debugging for all keys during test
                this.logActivity(`Key released: ${e.key || 'Unknown'} (keyCode: ${e.keyCode || 'N/A'}, which: ${e.which || 'N/A'}, code: ${e.code || 'N/A'})`, 'debug');
            }
        });

        // Additional debugging for all key presses during test
        document.addEventListener('keypress', (e) => {
            if (this.testActive) {
                this.logActivity(`Key pressed: ${e.key || 'Unknown'} (keyCode: ${e.keyCode || 'N/A'}, which: ${e.which || 'N/A'}, code: ${e.code || 'N/A'})`, 'debug');
            }
        });

        // Enhanced debugging - log ALL keydown events to console
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key, 'Code:', e.code, 'KeyCode:', e.keyCode, 'Which:', e.which);
            if (this.testActive) {
                this.logActivity(`KEYDOWN: ${e.key || 'Unknown'} (keyCode: ${e.keyCode || 'N/A'}, which: ${e.which || 'N/A'}, code: ${e.code || 'N/A'})`, 'debug');
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
        
        // Setup comprehensive mouse tracking
        this.setupMouseTracking();
    }

    setupClipboardMonitoring() {
        // Monitor clipboard API access attempts
        if (navigator.clipboard && navigator.clipboard.readText) {
            const originalReadText = navigator.clipboard.readText;
            navigator.clipboard.readText = () => {
                if (this.testActive) {
                    this.logActivity('Unauthorized clipboard read attempt detected', 'warning');
                    this.showWarning('Clipboard access is not allowed during the test!');
                    this.copyPasteCount++;
                    this.updateDisplay();
                    throw new Error('Clipboard access blocked during test');
                }
                return originalReadText.apply(navigator.clipboard);
            };
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            const originalWriteText = navigator.clipboard.writeText;
            navigator.clipboard.writeText = (text) => {
                if (this.testActive) {
                    this.logActivity('Unauthorized clipboard write attempt detected', 'warning');
                    this.showWarning('Clipboard access is not allowed during the test!');
                    this.copyPasteCount++;
                    this.updateDisplay();
                    throw new Error('Clipboard access blocked during test');
                }
                return originalWriteText.apply(navigator.clipboard, [text]);
            };
        }

        // Monitor for clipboard events
        document.addEventListener('beforecopy', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.copyPasteCount++;
                this.logActivity('Copy operation intercepted via beforecopy event', 'warning');
                this.showWarning('Copy operations are blocked during the test!');
                this.updateDisplay();
                return false;
            }
        });

        document.addEventListener('beforepaste', (e) => {
            if (this.testActive) {
                e.preventDefault();
                this.copyPasteCount++;
                this.logActivity('Paste operation intercepted via beforepaste event', 'warning');
                this.showWarning('Paste operations are blocked during the test!');
                this.updateDisplay();
                return false;
            }
        });

        // Monitor for selection change to detect potential copy attempts
        document.addEventListener('selectionchange', () => {
            if (this.testActive) {
                const selection = window.getSelection();
                if (selection.toString().length > 50) { // Substantial text selection
                    this.logActivity(`Large text selection detected: ${selection.toString().length} characters`, 'warning');
                }
            }
        });

        this.logActivity('Clipboard monitoring initialized', 'info');
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

        this.logActivity('Screenshot detection initialized', 'info');
    }

    detectScreenshotKeycodes(e) {
        // Enhanced Print Screen detection with multiple approaches
        const screenshotKeycodes = {
            44: 'Print Screen',
            124: 'Print Screen',
            154: 'Print Screen',  // Alternative keycode
            122: 'Print Screen'   // Another alternative
        };

        // Debug: Log every call to this function
        if (this.testActive) {
            console.log('detectScreenshotKeycodes called with:', {
                key: e.key,
                code: e.code, 
                keyCode: e.keyCode,
                which: e.which,
                eventType: e.type
            });
        }

        // Check by keyCode, which, and key name
        const isPrintScreen = screenshotKeycodes[e.keyCode] || 
                             screenshotKeycodes[e.which] || 
                             e.key === 'PrintScreen' || 
                             e.key === 'Print' ||
                             e.code === 'PrintScreen' ||
                             e.code === 'Print';

        if (isPrintScreen) {
            console.log('🚨 PRINT SCREEN DETECTED!', e);
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            this.copyPasteCount++;
            let warningMessage = 'Print Screen detected and blocked!';
            let logMessage = 'Print Screen key pressed';
            
            if (e.altKey) {
                warningMessage = 'Alt+Print Screen is not allowed during the test!';
                logMessage = 'Alt+Print Screen pressed - Window screenshot attempt blocked';
            } else if (e.ctrlKey) {
                warningMessage = 'Ctrl+Print Screen is not allowed during the test!';
                logMessage = 'Ctrl+Print Screen pressed - Screenshot attempt blocked';
            } else if (e.metaKey || e.key === 'Meta') {
                warningMessage = 'Windows+Print Screen is not allowed during the test!';
                logMessage = 'Windows+Print Screen pressed - System screenshot attempt blocked';
            }
            
            this.showWarning(warningMessage);
            this.logActivity(logMessage, 'warning');
            this.updateDisplay();
            return false;
        }
        
        return true;
    }

    startTest() {
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
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 10 }
                },
                audio: false
            });

            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(this.screenStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.finalizeRecording();
            };

            this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.logActivity('Screen recording ended - User stopped sharing', 'warning');
                this.screenRecording = false;
                this.updateScreenStatus();
                if (this.testActive) {
                    this.showWarning('Screen recording stopped! This is considered a violation.');
                }
            });

            this.screenRecording = true;
            this.updateScreenStatus();
            this.logActivity('Screen recording initialized', 'info');
            
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
        
        const startBtn = document.getElementById('startTest');
        const endBtn = document.getElementById('endTest');
        const testStatus = document.getElementById('testStatus');
        
        if (startBtn) startBtn.disabled = true;
        if (endBtn) endBtn.disabled = false;
        if (testStatus) {
            testStatus.textContent = 'In Progress';
            testStatus.style.color = '#e53e3e';
        }
        
        this.startTimer();
        
        if (this.webcamActive) {
            this.startWebcamMonitoring();
        }

        if (this.screenRecording) {
            this.startScreenRecording();
        }
        
        this.logActivity('Test started - Attempting to enter fullscreen mode', 'info');
        this.updateDisplay();
        
        this.showWarning('Test is starting! Click "I Understand" to enter fullscreen mode and begin monitoring.', () => {
            this.enterFullscreen();
        });
    }

    endTest() {
        this.testActive = false;
        
        this.stopWebcamMonitoring();
        this.stopScreenRecording();
        this.stopMouseTracking();
        this.exitFullscreen();
        
        const startBtn = document.getElementById('startTest');
        const endBtn = document.getElementById('endTest');
        const testStatus = document.getElementById('testStatus');
        
        if (startBtn) startBtn.disabled = false;
        if (endBtn) endBtn.disabled = true;
        if (testStatus) {
            testStatus.textContent = 'Completed';
            testStatus.style.color = '#38a169';
        }
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
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
        
        const mouseStats = this.getMouseTrackingSummary();
        
        const summary = `Test Summary:
Time taken: ${minutes}m ${seconds}s
Tab switches: ${this.tabSwitchCount}
Copy/Paste & Screenshots: ${this.copyPasteCount}
Webcam snapshots: ${this.snapshotCount}
Screen recording: ${this.screenRecording ? 'Completed' : 'Not available'}

Mouse Activity Analysis:
Total mouse movement: ${mouseStats.totalDistance} pixels
Screen coverage: ${mouseStats.coveragePercentage}%
Mouse left browser: ${mouseStats.browserExitCount} times
Large mouse jumps: ${mouseStats.jumpCount}
Suspicious movements: ${mouseStats.suspiciousMovementCount}
Total idle time: ${mouseStats.totalIdleTime}s

Total violations: ${this.tabSwitchCount + this.copyPasteCount + mouseStats.jumpCount + mouseStats.suspiciousMovementCount}`;
        
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
        const originalConsole = console.log;
        let consoleOutput = [];
        
        console.log = (...args) => {
            consoleOutput.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
        };
        
        try {
            const result = eval(code);
            
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
        
        // Show last 20 entries to include debug messages
        const logEntries = this.activityLog.slice(-20).map(entry => `
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
        
        this.warningCallback = callback;
    }

    hideWarning() {
        const warningOverlay = document.getElementById('warningOverlay');
        if (warningOverlay) warningOverlay.classList.remove('show');
        
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
            } else if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                return element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
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
                this.showWarning('Unable to enter fullscreen mode automatically. Please press F11 to enter fullscreen manually.');
            });
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.mozFullScreenElement || 
                 document.webkitFullscreenElement || 
                 document.msFullscreenElement ||
                 window.innerHeight === screen.height);
    }

    startWebcamMonitoring() {
        if (!this.webcamActive) return;
        
        this.logActivity('Starting webcam monitoring - snapshots every 10 seconds', 'info');
        this.takeSnapshot();
        
        this.snapshotInterval = setInterval(() => {
            if (this.testActive) {
                this.takeSnapshot();
            }
        }, 10000);
        
        const video = document.getElementById('webcamVideo');
        if (video) video.classList.add('recording');
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
        
        const webcamContainer = document.getElementById('webcamContainer');
        if (webcamContainer) webcamContainer.style.display = 'none';
        
        const indicator = document.getElementById('webcamIndicator');
        if (indicator) indicator.remove();
        
        this.updateWebcamStatus();
    }

    startScreenRecording() {
        if (this.mediaRecorder && this.screenRecording) {
            try {
                this.mediaRecorder.start(1000);
                this.logActivity('Screen recording started', 'info');
            } catch (error) {
                this.logActivity('Failed to start screen recording: ' + error.message, 'warning');
            }
        }
    }

    stopScreenRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        this.screenRecording = false;
        
        const indicator = document.getElementById('screenIndicator');
        if (indicator) indicator.remove();
        
        this.updateScreenStatus();
    }

    finalizeRecording() {
        if (this.recordedChunks.length > 0) {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            this.downloadRecording(blob);
            this.recordedChunks = [];
        }
    }

    downloadRecording(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-recording-${new Date().toISOString().slice(0, 19)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        this.logActivity('Screen recording downloaded', 'info');
    }

    takeSnapshot() {
        const video = document.getElementById('webcamVideo');
        const canvas = document.getElementById('snapshotCanvas');
        
        if (video && canvas && video.videoWidth > 0) {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                this.snapshots.push({
                    timestamp: new Date().toISOString(),
                    blob: blob
                });
                this.snapshotCount++;
                this.updateDisplay();
                this.logActivity(`Webcam snapshot ${this.snapshotCount} taken`, 'info');
            }, 'image/jpeg', 0.8);
        }
    }

    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseenter', () => {
            if (this.mouseTracking.leftBrowser) {
                const exitDuration = Date.now() - this.mouseTracking.browserExitTime;
                this.mouseTracking.browserExitTime += exitDuration;
                this.mouseTracking.leftBrowser = false;
                this.logActivity(`Mouse returned to browser after ${(exitDuration / 1000).toFixed(1)}s`, 'info');
            }
        });
        
        document.addEventListener('mouseleave', () => {
            if (this.testActive) {
                this.mouseTracking.leftBrowser = true;
                this.mouseTracking.browserExitCount++;
                this.mouseTracking.browserExitTime = Date.now();
                this.logActivity('Mouse left browser window', 'warning');
            }
        });
        
        this.startIdleMonitoring();
        this.logActivity('Mouse tracking initialized', 'info');
    }

    handleMouseMove(e) {
        if (!this.testActive) return;
        
        this.resetIdleTimer();
        
        const currentPos = { x: e.clientX, y: e.clientY };
        
        if (this.mouseTracking.lastPosition.x !== 0 || this.mouseTracking.lastPosition.y !== 0) {
            const distance = this.calculateDistance(this.mouseTracking.lastPosition, currentPos);
            this.mouseTracking.totalDistance += distance;
            
            if (distance > this.mouseTracking.jumpThreshold) {
                this.mouseTracking.jumpCount++;
                this.logActivity(`Large mouse jump detected: ${distance.toFixed(0)} pixels`, 'warning');
            }
        }
        
        this.mouseTracking.lastPosition = currentPos;
        this.mouseTracking.movementHistory.push(currentPos);
        
        if (this.mouseTracking.movementHistory.length > this.mouseTracking.maxHistoryLength) {
            this.mouseTracking.movementHistory.shift();
        }
        
        const gridX = Math.floor(currentPos.x / this.mouseTracking.gridSize);
        const gridY = Math.floor(currentPos.y / this.mouseTracking.gridSize);
        const gridKey = `${gridX},${gridY}`;
        
        if (!this.mouseTracking.visitedAreas.has(gridKey)) {
            this.mouseTracking.visitedAreas.add(gridKey);
            const totalGrids = Math.ceil(window.innerWidth / this.mouseTracking.gridSize) * 
                              Math.ceil(window.innerHeight / this.mouseTracking.gridSize);
            this.mouseTracking.totalCoverage = (this.mouseTracking.visitedAreas.size / totalGrids) * 100;
        }
    }

    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
    }

    startIdleMonitoring() {
        this.mouseTracking.idleInterval = setInterval(() => {
            if (this.testActive) {
                const currentTime = Date.now();
                const idleTime = currentTime - this.mouseTracking.lastActivity;
                
                if (idleTime > this.mouseTracking.idleWarningDuration && !this.mouseTracking.isIdle) {
                    this.logActivity('Mouse inactivity warning - 20 seconds idle', 'warning');
                }
                
                if (idleTime > this.mouseTracking.idleTimeoutDuration) {
                    if (!this.mouseTracking.isIdle) {
                        this.mouseTracking.isIdle = true;
                        this.mouseTracking.idleSessionStart = currentTime;
                        this.logActivity('Mouse idle timeout reached - User appears inactive', 'warning');
                        this.showWarning('Extended inactivity detected! This may indicate the user has left the test area.');
                    }
                } else if (this.mouseTracking.isIdle) {
                    const idleSessionDuration = currentTime - this.mouseTracking.idleSessionStart;
                    this.mouseTracking.totalIdleTime += idleSessionDuration;
                    this.mouseTracking.isIdle = false;
                    this.logActivity(`User returned from idle state after ${(idleSessionDuration / 1000).toFixed(1)} seconds`, 'info');
                }
            }
        }, 1000);
    }

    resetIdleTimer() {
        this.mouseTracking.lastActivity = Date.now();
        
        if (this.mouseTracking.isIdle) {
            const idleSessionDuration = Date.now() - this.mouseTracking.idleSessionStart;
            this.mouseTracking.totalIdleTime += idleSessionDuration;
            this.mouseTracking.isIdle = false;
            this.logActivity('User activity resumed', 'info');
        }
    }

    stopMouseTracking() {
        if (this.mouseTracking.idleInterval) {
            clearInterval(this.mouseTracking.idleInterval);
            this.mouseTracking.idleInterval = null;
        }
        
        if (this.mouseTracking.isIdle && this.mouseTracking.idleSessionStart) {
            const finalIdleTime = Date.now() - this.mouseTracking.idleSessionStart;
            this.mouseTracking.totalIdleTime += finalIdleTime;
        }
        
        this.logActivity('Mouse tracking stopped', 'info');
    }

    getMouseTrackingSummary() {
        return {
            totalDistance: this.mouseTracking.totalDistance.toFixed(2),
            coveragePercentage: this.mouseTracking.totalCoverage.toFixed(2),
            browserExitCount: this.mouseTracking.browserExitCount,
            browserExitTime: this.mouseTracking.browserExitTime,
            jumpCount: this.mouseTracking.jumpCount,
            highAccelerationCount: this.mouseTracking.highAccelerationCount,
            suspiciousMovementCount: this.mouseTracking.suspiciousMovementCount,
            totalIdleTime: (this.mouseTracking.totalIdleTime / 1000).toFixed(1),
            currentlyIdle: this.mouseTracking.isIdle
        };
    }
}

// Initialize the platform when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mockTestPlatform = new MockTestPlatform();
    
    setInterval(() => {
        if (window.mockTestPlatform) {
            window.mockTestPlatform.updateFullscreenStatus();
        }
    }, 1000);
    
    console.log('Mock Test Platform Loaded');
});

// Prevent common cheating methods
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['u', 'c', 'v', 'x', 'a'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        return false;
    }
    
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
