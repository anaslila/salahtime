// ==================== GLOBAL VARIABLES ==================== //
let currentSection = 'namaz-time';
let tasbihCount = 0;
let tasbihTarget = 33;
let currentTasbihType = 'subhanallah';

// Mock prayer times data
const prayerTimesData = {
    fajr: '05:24',
    zuhr: '13:15',  
    asr: '16:45',
    maghrib: '19:28',
    isha: '20:52'
};

// ==================== TIME FORMATTING FUNCTIONS ==================== //
function updateCurrentTime() {
    const now = new Date();
    
    // Fix 12-hour format with seconds
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update DOM elements safely
    const timeElement = document.querySelector('.current-time');
    const dateElement = document.querySelector('.current-date');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Update every second
setInterval(updateCurrentTime, 1000);

function formatTime12hrWithSeconds(timeStr) {
    const now = new Date();
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    now.setHours(hour, minute, now.getSeconds(), 0);

    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // 0 hour should be 12

    const hh = h < 10 ? '0' + h : h;
    const mm = m < 10 ? '0' + m : m;
    const ss = s < 10 ? '0' + s : s;

    return `${hh}:${mm}:${ss} ${ampm}`;
}

function updateCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    const strTime = [hours, minutes, seconds].map(x => x < 10 ? '0' + x : x).join(':') + ' ' + ampm;
    
    const currentTimeElement = document.querySelector('.current-time');
    if (currentTimeElement) {
        currentTimeElement.textContent = strTime;
    }
}

function updatePrayerTimesDisplay() {
    const prayerIds = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
    prayerIds.forEach(id => {
        const elem = document.querySelector(`#${id}-card .prayer-time`);
        if (elem && prayerTimesData[id]) {
            elem.textContent = formatTime12hrWithSeconds(prayerTimesData[id]);
        }
    });
}

// ==================== SECTION NAVIGATION ==================== //
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in');
    }
    
    // Update navigation
    updateNavigation(sectionId);
    currentSection = sectionId;
}

function updateNavigation(activeSection) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-section="${activeSection}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// ==================== TASBIH FUNCTIONALITY ==================== //
function incrementTasbih() {
    if (tasbihCount < tasbihTarget) {
        tasbihCount++;
        updateTasbihDisplay();
        
        // Play sound effect (simple beep)
        playBeepSound();
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Check if target reached
        if (tasbihCount === tasbihTarget) {
            showNotification('🎉 Tasbih Complete!', `You completed ${tasbihTarget} ${currentTasbihType}!`);
            
            // Celebrate with longer vibration
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 100]);
            }
        }
    }
}

function resetTasbih() {
    tasbihCount = 0;
    updateTasbihDisplay();
    showNotification('🔄 Counter Reset', 'Tasbih counter has been reset to 0');
}

function updateTasbihDisplay() {
    const countElement = document.querySelector('.current-count');
    const targetElement = document.querySelector('.target-count');
    
    if (countElement) {
        countElement.textContent = tasbihCount;
    }
    
    if (targetElement) {
        targetElement.textContent = `of ${tasbihTarget}`;
    }
}

function playBeepSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('Audio not supported');
    }
}

// ==================== NOTIFICATION SYSTEM ==================== //
function showNotification(title, message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(5, 150, 105, 0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: 'Product Sans', 'Roboto', Arial, sans-serif;
        animation: slideInRight 0.3s ease-out;
    `;
    
    toast.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ==================== EVENT HANDLERS ==================== //
function setupEventListeners() {
    // Profile icon click
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            showNotification('👤 Profile', 'Profile settings will be available soon!');
        });
    }

    // Notification icon click
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            showNotification('🔔 Notifications', 'You have 3 prayer reminders and 2 spiritual insights waiting!');
        });
    }

    // Settings FAB
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showSection('settings');
        });
    }

    // Tasbih counter button
    const tasbihCounterBtn = document.getElementById('tasbih-counter-btn');
    if (tasbihCounterBtn) {
        tasbihCounterBtn.addEventListener('click', incrementTasbih);
    }

    // Reset tasbih button
    const resetTasbihBtn = document.getElementById('reset-tasbih');
    if (resetTasbihBtn) {
        resetTasbihBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the counter?')) {
                resetTasbih();
            }
        });
    }

    // Vibrate toggle
    const vibrateToggle = document.getElementById('vibrate-toggle');
    if (vibrateToggle) {
        vibrateToggle.addEventListener('click', function() {
            if (navigator.vibrate) {
                navigator.vibrate(200);
                showNotification('📳 Vibration', 'Vibration is enabled for counter feedback');
            } else {
                showNotification('📳 Vibration', 'Vibration not supported on this device');
            }
        });
    }

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                showSection(section);
                showNotification('📱 Navigation', `Switched to ${section.replace('-', ' ')} section`);
            }
        });
    });

    // Prayer card interactions
    document.querySelectorAll('.prayer-card').forEach(card => {
        card.addEventListener('click', function() {
            const prayerName = this.id.replace('-card', '');
            const isCompleted = this.classList.contains('completed');
            
            if (!isCompleted) {
                this.classList.add('completed');
                showNotification('✅ Prayer Completed', `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer marked as completed!`);
            } else {
                showNotification('📊 Prayer Stats', `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer was completed today`);
            }
        });
    });

    // Settings form handlers
    const calculationMethod = document.getElementById('calculation-method');
    if (calculationMethod) {
        calculationMethod.addEventListener('change', function() {
            showNotification('⚙️ Settings', `Calculation method changed to ${this.options[this.selectedIndex].text}`);
        });
    }

    const enableNotifications = document.getElementById('enable-notifications');
    if (enableNotifications) {
        enableNotifications.addEventListener('change', function() {
            const status = this.checked ? 'enabled' : 'disabled';
            showNotification('🔔 Notifications', `Prayer notifications ${status}`);
        });
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            showNotification('🎨 Theme', `Theme changed to ${this.value} mode`);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    showSection('namaz-time');
                    break;
                case '2':
                    e.preventDefault();
                    showSection('quran');
                    break;
                case '3':
                    e.preventDefault();
                    showSection('tasbih');
                    break;
                case '4':
                    e.preventDefault();
                    showSection('qiblah');
                    break;
                case '5':
                    e.preventDefault();
                    showSection('hadees');
                    break;
            }
        }
    });
}

// ==================== CSS ANIMATIONS ==================== //
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .fade-in {
            animation: fadeInDown 0.6s ease-out;
        }
        
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// ==================== INITIALIZATION ==================== //
document.addEventListener('DOMContentLoaded', function() {
    // Add animation styles
    addAnimationStyles();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start time updates
    updateCurrentTime();
    updatePrayerTimesDisplay();
    setInterval(updateCurrentTime, 1000);
    setInterval(updatePrayerTimesDisplay, 1000);
    
    // Initialize tasbih display
    updateTasbihDisplay();
    
    // Show initial section
    showSection('namaz-time');
    
    // Welcome notification
    setTimeout(() => {
        showNotification('🕌 Welcome!', 'Salah Time Indicator is ready. May your prayers be blessed!');
    }, 1000);
    
    console.log('Salah Time Indicator initialized successfully with all features working!');
});

// ==================== GLOBAL ERROR HANDLER ==================== //
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('⚠️ Error', 'An unexpected error occurred. Please refresh the page.');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('⚠️ Error', 'Failed to load some data. Please check your connection.');
});
// Add this to your JavaScript console to check basic functionality
console.log("Current section:", currentSection);
console.log("Tasbih count:", tasbihCount);
console.log("User settings:", userSettings);
console.log("Prayer times data:", currentPrayerTimes);

// Check if DOM elements exist
console.log("Navigation tabs:", document.querySelectorAll('.nav-tab').length);
console.log("Prayer cards:", document.querySelectorAll('.prayer-card').length);
console.log("Header icons:", document.querySelectorAll('.header-icon').length);
