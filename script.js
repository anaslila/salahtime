// ==================== GLOBAL VARIABLES ==================== //
let currentPrayerTimes = {};
let userLocation = { latitude: null, longitude: null, city: '', country: '' };
let userSettings = {
    calculationMethod: 1,
    asrMethod: 1,
    theme: 'auto',
    language: 'en',
    enableNotifications: true,
    azanVolume: 80,
    reminderTime: 15
};
let tasbihCounter = {
    currentCount: 0,
    targetCount: 33,
    currentType: 'subhanallah',
    history: {}
};
let currentSection = 'namaz-time';
let qiblahDirection = 0;
let isServiceWorkerRegistered = false;

// ==================== PRAYER TIME CALCULATION ==================== //
class PrayerTimeCalculator {
    constructor() {
        this.methods = {
            1: { name: 'Muslim World League', fajr: 18, isha: 17 },
            2: { name: 'ISNA', fajr: 15, isha: 15 },
            3: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
            4: { name: 'Umm Al-Qura University', fajr: 18.5, isha: 90 },
            5: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 }
        };
    }

    async fetchPrayerTimes(latitude, longitude, method = 1) {
        try {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            const response = await fetch(
                `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${method}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch prayer times');
            }
            
            const data = await response.json();
            return this.processPrayerTimes(data.data);
        } catch (error) {
            console.error('Error fetching prayer times:', error);
            return this.getDefaultPrayerTimes();
        }
    }

    processPrayerTimes(data) {
        const timings = data.timings;
        const date = data.date;
        
        return {
            fajr: this.convertTo12Hour(timings.Fajr),
            zuhr: this.convertTo12Hour(timings.Dhuhr),
            asr: this.convertTo12Hour(timings.Asr),
            maghrib: this.convertTo12Hour(timings.Maghrib),
            isha: this.convertTo12Hour(timings.Isha),
            sunrise: this.convertTo12Hour(timings.Sunrise),
            sunset: this.convertTo12Hour(timings.Sunset),
            date: {
                gregorian: date.gregorian,
                hijri: date.hijri
            },
            qibla: data.meta.latitude && data.meta.longitude ? 
                   this.calculateQiblaDirection(data.meta.latitude, data.meta.longitude) : 0
        };
    }

    convertTo12Hour(time24) {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    convertTo24Hour(time12) {
        const [time, period] = time12.split(' ');
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        return `${hour.toString().padStart(2, '0')}:${minutes}`;
    }

    calculateQiblaDirection(latitude, longitude) {
        const kaabaLat = 21.4225; // Kaaba latitude
        const kaabaLon = 39.8262; // Kaaba longitude
        
        const lat1 = latitude * Math.PI / 180;
        const lat2 = kaabaLat * Math.PI / 180;
        const deltaLon = (kaabaLon - longitude) * Math.PI / 180;
        
        const x = Math.sin(deltaLon) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        
        let bearing = Math.atan2(x, y) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        
        return Math.round(bearing);
    }

    getDefaultPrayerTimes() {
        return {
            fajr: '5:24 AM',
            zuhr: '1:15 PM',
            asr: '4:45 PM',
            maghrib: '7:28 PM',
            isha: '8:52 PM',
            sunrise: '6:30 AM',
            sunset: '7:28 PM',
            date: {
                gregorian: { date: new Date() },
                hijri: { date: '25 Muharram 1447', month: { ar: 'محرم' } }
            },
            qibla: 67
        };
    }

    getNextPrayer() {
        const now = new Date();
        const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
        
        for (const prayer of prayers) {
            const prayerTime = this.convertTo24Hour(currentPrayerTimes[prayer]);
            const [hours, minutes] = prayerTime.split(':');
            const prayerDate = new Date();
            prayerDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            if (prayerDate > now) {
                return {
                    name: prayer,
                    time: currentPrayerTimes[prayer],
                    remaining: this.getTimeRemaining(prayerDate)
                };
            }
        }
        
        // If no prayer today, return Fajr tomorrow
        const fajrTime = this.convertTo24Hour(currentPrayerTimes.fajr);
        const [hours, minutes] = fajrTime.split(':');
        const fajrTomorrow = new Date();
        fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
        fajrTomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        return {
            name: 'fajr',
            time: currentPrayerTimes.fajr,
            remaining: this.getTimeRemaining(fajrTomorrow)
        };
    }

    getTimeRemaining(targetTime) {
        const now = new Date();
        const diff = targetTime - now;
        
        if (diff <= 0) return '0m';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

// ==================== LOCATION SERVICE ==================== //
class LocationService {
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationInfo = await this.reverseGeocode(latitude, longitude);
                    
                    userLocation = {
                        latitude,
                        longitude,
                        city: locationInfo.city,
                        country: locationInfo.country
                    };
                    
                    resolve(userLocation);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Use default location (New York) as fallback
                    userLocation = {
                        latitude: 40.7128,
                        longitude: -74.0060,
                        city: 'New York',
                        country: 'USA'
                    };
                    resolve(userLocation);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    async reverseGeocode(latitude, longitude) {
        try {
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            
            if (!response.ok) {
                throw new Error('Geocoding failed');
            }
            
            const data = await response.json();
            return {
                city: data.city || data.locality || 'Unknown',
                country: data.countryName || 'Unknown'
            };
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return { city: 'Unknown', country: 'Unknown' };
        }
    }
}

// ==================== NOTIFICATION SERVICE ==================== //
class NotificationService {
    constructor() {
        this.permission = 'default';
        this.registrations = [];
    }

    async requestPermission() {
        if ('Notification' in window) {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        }
        return false;
    }

    async scheduleNotification(title, body, time, tag) {
        if (this.permission !== 'granted') {
            await this.requestPermission();
        }

        if (this.permission === 'granted') {
            const notificationTime = new Date(time);
            const now = new Date();
            const delay = notificationTime - now;

            if (delay > 0) {
                setTimeout(() => {
                    new Notification(title, {
                        body,
                        icon: '/icons/praying_main_logo.svg',
                        tag,
                        requireInteraction: true,
                        actions: [
                            { action: 'open', title: 'Open App' },
                            { action: 'dismiss', title: 'Dismiss' }
                        ]
                    });
                }, delay);
            }
        }
    }

    schedulePrayerNotifications() {
        const prayers = [
            { name: 'Fajr', arabic: 'الفجر' },
            { name: 'Zuhr', arabic: 'الظهر' },
            { name: 'Asr', arabic: 'العصر' },
            { name: 'Maghrib', arabic: 'المغرب' },
            { name: 'Isha', arabic: 'العشاء' }
        ];

        prayers.forEach(prayer => {
            const prayerTime = currentPrayerTimes[prayer.name.toLowerCase()];
            if (prayerTime) {
                const time24 = prayerTimeCalculator.convertTo24Hour(prayerTime);
                const [hours, minutes] = time24.split(':');
                const notificationTime = new Date();
                notificationTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                // Schedule notification 15 minutes before
                const reminderTime = new Date(notificationTime);
                reminderTime.setMinutes(reminderTime.getMinutes() - userSettings.reminderTime);

                this.scheduleNotification(
                    `${prayer.name} Prayer Time`,
                    `${prayer.arabic} - ${userSettings.reminderTime} minutes remaining`,
                    reminderTime,
                    `${prayer.name.toLowerCase()}-reminder`
                );

                // Schedule exact time notification
                this.scheduleNotification(
                    `${prayer.name} Prayer Time`,
                    `${prayer.arabic} - It's time for ${prayer.name} prayer`,
                    notificationTime,
                    `${prayer.name.toLowerCase()}-time`
                );
            }
        });
    }
}

// ==================== AUDIO SERVICE ==================== //
class AudioService {
    constructor() {
        this.azanAudio = null;
        this.currentVolume = userSettings.azanVolume / 100;
    }

    async loadAzan(azanType = 'makkah') {
        try {
            this.azanAudio = new Audio(`/audio/azan/${azanType}_azan.mp3`);
            this.azanAudio.volume = this.currentVolume;
            this.azanAudio.preload = 'auto';
        } catch (error) {
            console.error('Error loading azan audio:', error);
        }
    }

    async playAzan() {
        try {
            if (this.azanAudio) {
                await this.azanAudio.play();
                return true;
            }
        } catch (error) {
            console.error('Error playing azan:', error);
        }
        return false;
    }

    stopAzan() {
        if (this.azanAudio) {
            this.azanAudio.pause();
            this.azanAudio.currentTime = 0;
        }
    }

    setVolume(volume) {
        this.currentVolume = volume / 100;
        if (this.azanAudio) {
            this.azanAudio.volume = this.currentVolume;
        }
    }

    playNotificationSound() {
        const audio = new Audio('/audio/notifications/gentle_bell.mp3');
        audio.volume = 0.5;
        audio.play().catch(console.error);
    }
}

// ==================== TASBIH COUNTER SERVICE ==================== //
class TasbihService {
    constructor() {
        this.types = {
            subhanallah: {
                arabic: 'سُبْحَانَ ٱللَّٰهِ',
                english: 'SubhanAllah',
                translation: 'Glory be to Allah',
                target: 33,
                color: '#dc2626'
            },
            alhamdulillah: {
                arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
                english: 'Alhamdulillah',
                translation: 'All praise is due to Allah',
                target: 33,
                color: '#059669'
            },
            allahuakbar: {
                arabic: 'ٱللَّٰهُ أَكْبَرُ',
                english: 'Allahu Akbar',
                translation: 'Allah is the Greatest',
                target: 34,
                color: '#6366f1'
            }
        };
        
        this.loadFromStorage();
    }

    increment() {
        const currentType = this.types[tasbihCounter.currentType];
        
        if (tasbihCounter.currentCount < currentType.target) {
            tasbihCounter.currentCount++;
            
            // Play sound effect
            this.playCountSound();
            
            // Vibrate if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // Check if target reached
            if (tasbihCounter.currentCount === currentType.target) {
                this.onTargetReached();
            }
            
            this.saveToStorage();
            this.updateDisplay();
        }
    }

    reset() {
        tasbihCounter.currentCount = 0;
        this.saveToStorage();
        this.updateDisplay();
    }

    setType(type) {
        if (this.types[type]) {
            tasbihCounter.currentType = type;
            tasbihCounter.targetCount = this.types[type].target;
            this.saveToStorage();
            this.updateDisplay();
        }
    }

    playCountSound() {
        const audio = new Audio('/audio/counter_click.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Fallback: create beep sound
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
        });
    }

    onTargetReached() {
        // Record achievement
        const today = new Date().toDateString();
        if (!tasbihCounter.history[today]) {
            tasbihCounter.history[today] = {};
        }
        
        tasbihCounter.history[today][tasbihCounter.currentType] = 
            (tasbihCounter.history[today][tasbihCounter.currentType] || 0) + 1;
        
        // Show completion notification
        notificationService.scheduleNotification(
            'Tasbih Complete! 🎉',
            `You completed ${tasbihCounter.targetCount} ${this.types[tasbihCounter.currentType].english}`,
            new Date(),
            'tasbih-complete'
        );
        
        // Celebrate with longer vibration
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }
        
        this.saveToStorage();
    }

    updateDisplay() {
        const currentType = this.types[tasbihCounter.currentType];
        const progress = (tasbihCounter.currentCount / currentType.target) * 100;
        
        // Update Arabic text
        const arabicElement = document.querySelector('.dhikr-arabic');
        if (arabicElement) {
            arabicElement.textContent = currentType.arabic;
        }
        
        // Update translation
        const translationElement = document.querySelector('.dhikr-translation');
        if (translationElement) {
            translationElement.innerHTML = `
                <strong>${currentType.english}</strong><br>
                <small>${currentType.translation}</small>
            `;
        }
        
        // Update count
        const countElement = document.querySelector('.current-count');
        if (countElement) {
            countElement.textContent = tasbihCounter.currentCount;
        }
        
        // Update target
        const targetElement = document.querySelector('.target-count');
        if (targetElement) {
            targetElement.textContent = `of ${currentType.target}`;
        }
        
        // Update progress ring
        const progressRing = document.querySelector('.progress-ring-progress');
        if (progressRing) {
            const circumference = 2 * Math.PI * 80; // radius = 80px
            const offset = circumference - (progress / 100) * circumference;
            progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
            progressRing.style.strokeDashoffset = offset;
        }
    }

    saveToStorage() {
        localStorage.setItem('tasbihCounter', JSON.stringify(tasbihCounter));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('tasbihCounter');
        if (saved) {
            const parsed = JSON.parse(saved);
            tasbihCounter = { ...tasbihCounter, ...parsed };
        }
    }
}

// ==================== UI CONTROLLER ==================== //
class UIController {
    constructor() {
        this.currentTheme = userSettings.theme;
        this.isLoading = false;
    }

    showSection(sectionId) {
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
        this.updateNavigation(sectionId);
        
        // Update current section
        currentSection = sectionId;
        
        // Load section-specific content
        this.loadSectionContent(sectionId);
    }

    updateNavigation(activeSection) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-section="${activeSection}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    async loadSectionContent(sectionId) {
        switch (sectionId) {
            case 'namaz-time':
                await this.updatePrayerTimes();
                break;
            case 'quran':
                await this.loadDailyVerse();
                break;
            case 'tasbih':
                this.initializeTasbih();
                break;
            case 'qiblah':
                this.initializeQiblah();
                break;
            case 'hadees':
                await this.loadDailyHadees();
                break;
        }
    }

    async updatePrayerTimes() {
        this.showLoading(true);
        
        try {
            currentPrayerTimes = await prayerTimeCalculator.fetchPrayerTimes(
                userLocation.latitude,
                userLocation.longitude,
                userSettings.calculationMethod
            );
            
            this.displayPrayerTimes();
            this.updateCurrentTimeDisplay();
            this.scheduleNextUpdate();
            
            // Schedule notifications
            if (userSettings.enableNotifications) {
                notificationService.schedulePrayerNotifications();
            }
        } catch (error) {
            console.error('Error updating prayer times:', error);
            this.showError('Failed to load prayer times');
        } finally {
            this.showLoading(false);
        }
    }

    displayPrayerTimes() {
        const prayers = [
            { id: 'fajr', name: 'Fajr', arabic: 'الفجر', icon: '🌅' },
            { id: 'zuhr', name: 'Zuhr', arabic: 'الظهر', icon: '☀️' },
            { id: 'asr', name: 'Asr', arabic: 'العصر', icon: '🌤️' },
            { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', icon: '🌅' },
            { id: 'isha', name: 'Isha', arabic: 'العشاء', icon: '🌙' }
        ];
        
        const nextPrayer = prayerTimeCalculator.getNextPrayer();
        
        prayers.forEach(prayer => {
            const card = document.getElementById(`${prayer.id}-card`);
            if (card) {
                const isNext = nextPrayer.name === prayer.id;
                const isCompleted = this.isPrayerCompleted(prayer.id);
                
                card.className = `prayer-card ${prayer.id} ${isNext ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
                
                card.innerHTML = `
                    <div class="prayer-header">
                        <div class="prayer-icon">${prayer.icon}</div>
                        <div class="prayer-title">
                            <h3 class="prayer-name">${prayer.name}</h3>
                            <p class="prayer-arabic">${prayer.arabic}</p>
                        </div>
                    </div>
                    <div class="prayer-time">${currentPrayerTimes[prayer.id]}</div>
                    <div class="prayer-details">
                        ${this.getPrayerDetails(prayer.id)}
                    </div>
                    <div class="prayer-status ${isCompleted ? 'status-completed' : isNext ? 'status-next' : 'status-upcoming'}">
                        ${isCompleted ? 'Completed' : isNext ? 'Next Prayer' : 'Upcoming'}
                    </div>
                `;
            }
        });
    }

    updateCurrentTimeDisplay() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dateStr = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Update current time
        const currentTimeElement = document.querySelector('.current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = timeStr;
        }
        
        // Update current date
        const currentDateElement = document.querySelector('.current-date');
        if (currentDateElement) {
            currentDateElement.textContent = dateStr;
        }
        
        // Update Hijri date
        if (currentPrayerTimes.date) {
            const hijriElement = document.querySelector('.hijri-date');
            const hijriArabicElement = document.querySelector('.hijri-arabic');
            
            if (hijriElement && currentPrayerTimes.date.hijri) {
                hijriElement.textContent = `${currentPrayerTimes.date.hijri.date} AH`;
            }
            
            if (hijriArabicElement && currentPrayerTimes.date.hijri) {
                hijriArabicElement.textContent = `${currentPrayerTimes.date.hijri.date} هـ`;
            }
        }
        
        // Update next prayer countdown
        const nextPrayer = prayerTimeCalculator.getNextPrayer();
        this.updateNextPrayerCountdown(nextPrayer);
    }

    updateNextPrayerCountdown(nextPrayer) {
        const nameElement = document.querySelector('.next-prayer-name');
        const timeElement = document.querySelector('.next-prayer-time');
        const countdownElement = document.querySelector('.countdown');
        const progressBar = document.querySelector('.progress-fill');
        
        if (nameElement) nameElement.textContent = nextPrayer.name.charAt(0).toUpperCase() + nextPrayer.name.slice(1);
        if (timeElement) timeElement.textContent = nextPrayer.time;
        if (countdownElement) countdownElement.textContent = `${nextPrayer.remaining} remaining`;
        
        // Update progress bar (mock calculation for demo)
        if (progressBar) {
            const progress = Math.random() * 100; // Replace with actual calculation
            progressBar.style.width = `${progress}%`;
        }
    }

    async loadDailyVerse() {
        // Mock daily verse - replace with actual API call
        const verse = {
            arabic: 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ',
            translation: '"And establish prayer at the two ends of the day and at the approach of the night. Indeed, good deeds do away with misdeeds."',
            reference: 'Quran 11:114'
        };
        
        const arabicElement = document.querySelector('.arabic-text');
        const translationElement = document.querySelector('.translation-text');
        const referenceElement = document.querySelector('.reference-text');
        
        if (arabicElement) arabicElement.textContent = verse.arabic;
        if (translationElement) translationElement.textContent = verse.translation;
        if (referenceElement) referenceElement.textContent = verse.reference;
    }

    async loadDailyHadees() {
        // Mock daily hadees - replace with actual API call
        const hadees = {
            arabic: 'مَنْ صَلَّى الْفَجْرَ فِي جَمَاعَةٍ فَكَأَنَّمَا صَلَّى اللَّيْلَ كُلَّهُ، وَمَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ',
            translation: '"Whoever prays Fajr in congregation, it is as if he prayed the whole night, and whoever prays Isha in congregation, it is as if he stood half the night in prayer."',
            reference: 'Sahih Muslim'
        };
        
        const arabicElement = document.querySelector('#hadees-section .arabic-text');
        const translationElement = document.querySelector('#hadees-section .translation-text');
        const referenceElement = document.querySelector('#hadees-section .reference-text');
        
        if (arabicElement) arabicElement.textContent = hadees.arabic;
        if (translationElement) translationElement.textContent = hadees.translation;
        if (referenceElement) referenceElement.textContent = hadees.reference;
    }

    initializeTasbih() {
        tasbihService.updateDisplay();
        
        // Setup counter button
        const counterButton = document.querySelector('.counter-button');
        if (counterButton) {
            counterButton.addEventListener('click', () => {
                tasbihService.increment();
            });
        }
        
        // Setup reset button
        const resetButton = document.querySelector('[data-action="reset"]');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the counter?')) {
                    tasbihService.reset();
                }
            });
        }
        
        // Setup type selectors
        document.querySelectorAll('.tasbih-type').forEach(typeCard => {
            typeCard.addEventListener('click', () => {
                const type = typeCard.dataset.type;
                if (type) {
                    tasbihService.setType(type);
                    this.updateTasbihTypeSelection(type);
                }
            });
        });
    }

    initializeQiblah() {
        if (userLocation.latitude && userLocation.longitude) {
            qiblahDirection = prayerTimeCalculator.calculateQiblaDirection(
                userLocation.latitude,
                userLocation.longitude
            );
            
            this.updateQiblahDisplay();
        }
    }

    updateQiblahDisplay() {
        const arrow = document.querySelector('.qiblah-arrow');
        const directionCard = document.querySelector('#direction .info-card-value');
        const distanceCard = document.querySelector('#distance .info-card-value');
        const locationCard = document.querySelector('#location .info-card-value');
        
        if (arrow) {
            arrow.style.transform = `translate(-50%, -100%) rotate(${qiblahDirection}deg)`;
        }
        
        if (directionCard) {
            const direction = this.getCompassDirection(qiblahDirection);
            directionCard.textContent = `${qiblahDirection}° ${direction}`;
        }
        
        if (distanceCard && userLocation.latitude) {
            const distance = this.calculateDistanceToKaaba(userLocation.latitude, userLocation.longitude);
            distanceCard.textContent = `${distance.toLocaleString()} km`;
        }
        
        if (locationCard) {
            locationCard.textContent = `${userLocation.city}, ${userLocation.country}`;
        }
    }

    getCompassDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    calculateDistanceToKaaba(lat, lon) {
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;
        const R = 6371; // Earth's radius in km
        
        const dLat = (kaabaLat - lat) * Math.PI / 180;
        const dLon = (kaabaLon - lon) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c);
    }

    updateTasbihTypeSelection(selectedType) {
        document.querySelectorAll('.tasbih-type').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`[data-type="${selectedType}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
    }

    getPrayerDetails(prayerId) {
        const details = {
            fajr: '2 Rakats • Dawn Prayer',
            zuhr: '4 Rakats • Noon Prayer',
            asr: '4 Rakats • Afternoon Prayer',
            maghrib: '3 Rakats • Sunset Prayer',
            isha: '4 Rakats • Night Prayer'
        };
        return details[prayerId] || '';
    }

    isPrayerCompleted(prayerId) {
        // This would check local storage or user data
        // For demo, randomly return true/false
        const completedPrayers = JSON.parse(localStorage.getItem('completedPrayers') || '{}');
        const today = new Date().toDateString();
        return completedPrayers[today] && completedPrayers[today][prayerId];
    }

    markPrayerCompleted(prayerId) {
        const completedPrayers = JSON.parse(localStorage.getItem('completedPrayers') || '{}');
        const today = new Date().toDateString();
        
        if (!completedPrayers[today]) {
            completedPrayers[today] = {};
        }
        
        completedPrayers[today][prayerId] = true;
        localStorage.setItem('completedPrayers', JSON.stringify(completedPrayers));
        
        this.displayPrayerTimes(); // Refresh display
    }

    showLoading(show) {
        this.isLoading = show;
        const loadingElements = document.querySelectorAll('.loading-indicator');
        
        loadingElements.forEach(element => {
            element.style.display = show ? 'block' : 'none';
        });
        
        if (show) {
            document.body.classList.add('loading');
        } else {
            document.body.classList.remove('loading');
        }
    }

    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⚠️</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">✅</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    scheduleNextUpdate() {
        // Update every minute
        setTimeout(() => {
            this.updateCurrentTimeDisplay();
            this.scheduleNextUpdate();
        }, 60000);
    }

    applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        this.currentTheme = theme;
    }
}

// ==================== SERVICE WORKER REGISTRATION ==================== //
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            isServiceWorkerRegistered = true;
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// ==================== INITIALIZATION ==================== //
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize services
    window.prayerTimeCalculator = new PrayerTimeCalculator();
    window.locationService = new LocationService();
    window.notificationService = new NotificationService();
    window.audioService = new AudioService();
    window.tasbihService = new TasbihService();
    window.uiController = new UIController();
    
    // Load user settings
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
        userSettings = { ...userSettings, ...JSON.parse(savedSettings) };
    }
    
    // Apply saved theme
    uiController.applyTheme(userSettings.theme);
    
    try {
        // Get user location
        await locationService.getCurrentLocation();
        
        // Load audio
        await audioService.loadAzan();
        
        // Initialize UI
        uiController.showSection('namaz-time');
        
        // Setup event listeners
        setupEventListeners();
        
        // Register service worker
        await registerServiceWorker();
        
        // Request notification permission
        if (userSettings.enableNotifications) {
            await notificationService.requestPermission();
        }
        
        console.log('Salah Time Indicator initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        uiController.showError('Failed to initialize application');
    }
});

// ==================== EVENT LISTENERS ==================== //
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const section = tab.dataset.section;
            if (section) {
                uiController.showSection(section);
            }
        });
    });
    
    // Floating action button
    const fab = document.querySelector('.floating-action-button');
    if (fab) {
        fab.addEventListener('click', () => {
            // Show secondary menu or actions
            console.log('FAB clicked');
        });
    }
    
    // Prayer card interactions
    document.addEventListener('click', (e) => {
        if (e.target.closest('.prayer-card')) {
            const card = e.target.closest('.prayer-card');
            const prayerId = card.id.replace('-card', '');
            
            // Show prayer details or mark as completed
            if (confirm(`Mark ${prayerId} prayer as completed?`)) {
                uiController.markPrayerCompleted(prayerId);
                uiController.showSuccess(`${prayerId} prayer marked as completed!`);
            }
        }
    });
    
    // Action buttons
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-action]')) {
            const action = e.target.dataset.action;
            handleAction(action, e.target);
        }
    });
    
    // Settings changes
    document.addEventListener('change', (e) => {
        if (e.target.matches('[data-setting]')) {
            const setting = e.target.dataset.setting;
            const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            updateSetting(setting, value);
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    uiController.showSection('namaz-time');
                    break;
                case '2':
                    e.preventDefault();
                    uiController.showSection('quran');
                    break;
                case '3':
                    e.preventDefault();
                    uiController.showSection('tasbih');
                    break;
                case '4':
                    e.preventDefault();
                    uiController.showSection('qiblah');
                    break;
                case '5':
                    e.preventDefault();
                    uiController.showSection('hadees');
                    break;
            }
        }
    });
    
    // Handle visibility change for accurate time updates
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentSection === 'namaz-time') {
            uiController.updateCurrentTimeDisplay();
        }
    });
}

// ==================== ACTION HANDLERS ==================== //
function handleAction(action, element) {
    switch (action) {
        case 'play-azan':
            audioService.playAzan();
            break;
            
        case 'stop-azan':
            audioService.stopAzan();
            break;
            
        case 'increment-tasbih':
            tasbihService.increment();
            break;
            
        case 'reset-tasbih':
            if (confirm('Reset counter?')) {
                tasbihService.reset();
            }
            break;
            
        case 'bookmark-verse':
            bookmarkCurrentVerse();
            break;
            
        case 'share-verse':
            shareCurrentVerse();
            break;
            
        case 'favorite-hadees':
            favoriteCurrentHadees();
            break;
            
        case 'refresh-location':
            refreshLocation();
            break;
            
        case 'calibrate-compass':
            calibrateCompass();
            break;
            
        case 'toggle-theme':
            toggleTheme();
            break;
            
        default:
            console.log('Unknown action:', action);
    }
}

// ==================== UTILITY FUNCTIONS ==================== //
function updateSetting(setting, value) {
    userSettings[setting] = value;
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    
    // Apply setting changes
    switch (setting) {
        case 'theme':
            uiController.applyTheme(value);
            break;
        case 'azanVolume':
            audioService.setVolume(value);
            break;
        case 'calculationMethod':
            uiController.updatePrayerTimes();
            break;
    }
}

function bookmarkCurrentVerse() {
    // Implementation for bookmarking
    uiController.showSuccess('Verse bookmarked!');
}

function shareCurrentVerse() {
    // Implementation for sharing
    if (navigator.share) {
        navigator.share({
            title: 'Daily Quran Verse',
            text: 'Check out this beautiful verse from the Quran',
            url: window.location.href
        });
    }
}

function favoriteCurrentHadees() {
    uiController.showSuccess('Hadees added to favorites!');
}

async function refreshLocation() {
    try {
        uiController.showLoading(true);
        await locationService.getCurrentLocation();
        await uiController.updatePrayerTimes();
        uiController.updateQiblahDisplay();
        uiController.showSuccess('Location updated!');
    } catch (error) {
        uiController.showError('Failed to update location');
    } finally {
        uiController.showLoading(false);
    }
}

function calibrateCompass() {
    if (window.DeviceOrientationEvent) {
        uiController.showSuccess('Please rotate your device in a figure-8 motion to calibrate the compass');
    } else {
        uiController.showError('Compass not supported on this device');
    }
}

function toggleTheme() {
    const themes = ['light', 'dark', 'islamic_green'];
    const currentIndex = themes.indexOf(userSettings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    updateSetting('theme', nextTheme);
    uiController.showSuccess(`Theme changed to ${nextTheme.replace('_', ' ')}`);
}

// ==================== GLOBAL ERROR HANDLER ==================== //
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    uiController.showError('An unexpected error occurred');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    uiController.showError('Failed to load data');
});

// ==================== EXPORT FOR GLOBAL ACCESS ==================== //
window.SalahTimeIndicator = {
    prayerTimeCalculator,
    locationService,
    notificationService,
    audioService,
    tasbihService,
    uiController,
    userSettings,
    currentPrayerTimes,
    userLocation
};
// ==================== ICON CLICK HANDLERS ==================== //
document.addEventListener('DOMContentLoaded', function() {
    // Profile icon click
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            alert('Profile settings coming soon!');
        });
    }

    // Notification icon click
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            alert('You have 3 new prayer reminders!');
        });
    }

    // Play Azan button
    const playAzanBtn = document.getElementById('play-azan-btn');
    if (playAzanBtn) {
        playAzanBtn.addEventListener('click', function() {
            alert('🔊 Playing Azan...');
        });
    }

    // Prayer Tracker button
    const trackerBtn = document.getElementById('tracker-btn');
    if (trackerBtn) {
        trackerBtn.addEventListener('click', function() {
            alert('📊 Prayer tracker opened!');
        });
    }

    // Nearby Mosques button
    const mosqueBtn = document.getElementById('mosque-btn');
    if (mosqueBtn) {
        mosqueBtn.addEventListener('click', function() {
            alert('🕌 Finding nearby mosques...');
        });
    }

    // Settings FAB
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            alert('⚙️ Settings panel coming soon!');
        });
    }

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get section name
            const section = this.dataset.section;
            alert(`Navigating to ${section} section...`);
        });
    });
});
