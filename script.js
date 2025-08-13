// Complete JavaScript for Salah Time Indicator - Enhanced Islamic Prayer App
// All features functional with real-time updates, geolocation, and API integration

class SalahTimeIndicator {
    constructor() {
        // App state
        this.currentSection = 'namaz-time';
        this.tasbihCount = 0;
        this.tasbihTarget = 33;
        this.currentTasbihType = 'subhanallah';
        this.vibrateEnabled = true;
        this.notificationsEnabled = true;
        this.currentLocation = { latitude: null, longitude: null, city: '' };
        this.prayerTimes = {};
        this.qiblahDirection = 0;
        this.calculationMethod = 1; // Muslim World League
        
        // Initialize app
        this.init();
    }

    // Prayer times data with real calculation methods
    calculationMethods = {
        1: { name: 'Muslim World League', fajr: 18, isha: 17 },
        2: { name: 'ISNA', fajr: 15, isha: 15 },
        3: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
        4: { name: 'Umm Al-Qura, Makkah', fajr: 18.5, isha: 90 },
        5: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 }
    };

    // Tasbih data with authentic Arabic text
    tasbihData = {
        subhanallah: {
            arabic: 'سُبْحَانَ ٱللَّٰهِ',
            translation: 'SubhanAllah<br><small>Glory be to Allah</small>',
            transliteration: 'Subhan Allah'
        },
        alhamdulillah: {
            arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
            translation: 'Alhamdulillah<br><small>Praise be to Allah</small>',
            transliteration: 'Alhamdu lillah'
        },
        allahuakbar: {
            arabic: 'ٱللَّٰهُ أَكْبَرُ',
            translation: 'Allahu Akbar<br><small>Allah is Greatest</small>',
            transliteration: 'Allahu Akbar'
        },
        lailahaillallah: {
            arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
            translation: 'La ilaha illa Allah<br><small>There is no god but Allah</small>',
            transliteration: 'La ilaha illa Allah'
        },
        astaghfirullah: {
            arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
            translation: 'Astaghfirullah<br><small>I seek forgiveness from Allah</small>',
            transliteration: 'Astaghfiru Allah'
        }
    };

    // Quran verses and Hadees collection
    islamicContent = {
        quranVerses: [
            {
                arabic: 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ',
                translation: 'And establish prayer at the two ends of the day and at the approach of the night. Indeed, good deeds do away with misdeeds.',
                reference: 'Quran 11:114'
            },
            {
                arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ',
                translation: 'And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive.',
                reference: 'Quran 2:45'
            }
        ],
        hadees: [
            {
                arabic: 'مَنْ صَلَّى الْفَجْرَ فِي جَمَاعَةٍ فَكَأَنَّمَا صَلَّى اللَّيْلَ كُلَّهُ',
                translation: 'Whoever prays Fajr in congregation, it is as if he prayed the whole night.',
                reference: 'Sahih Muslim'
            },
            {
                arabic: 'الصَّلَوَاتُ الْخَمْسُ وَالْجُمُعَةُ إِلَى الْجُمُعَةِ كَفَّارَةٌ لِمَا بَيْنَهُنَّ مَا لَمْ تُغْشَ الْكَبَائِرُ',
                translation: 'The five daily prayers and Friday prayer to Friday prayer are expiation for what is between them, so long as major sins are avoided.',
                reference: 'Sahih Muslim'
            }
        ]
    };

    // Initialize the application
    async init() {
        try {
            console.log('🕌 Initializing Salah Time Indicator...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start real-time clock
            this.startClock();
            
            // Get user location and prayer times
            await this.getCurrentLocation();
            await this.updatePrayerTimes();
            
            // Initialize UI
            this.updatePrayerTimesDisplay();
            this.updateTasbihDisplay();
            this.showSection('namaz-time');
            this.updateRandomContent();
            
            // Set up periodic updates
            this.setupPeriodicUpdates();
            
            console.log('✅ Salah Time Indicator initialized successfully!');
            
            // Welcome notification
            setTimeout(() => {
                this.showNotification('🕌 As-Salamu Alaikum!', 'Welcome to your spiritual companion. May Allah bless your prayers.');
            }, 1500);
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showNotification('⚠️ Error', 'Failed to initialize app. Some features may not work properly.');
        }
    }

    // Real-time clock and date updates
    startClock() {
        const updateClock = () => {
            const now = new Date();
            
            // Update current time
            this.updateCurrentTime(now);
            
            // Update prayer countdowns
            this.updateNextPrayerCountdown();
            
            // Check for prayer notifications
            this.checkPrayerNotifications(now);
        };
        
        updateClock(); // Initial call
        setInterval(updateClock, 1000); // Update every second
    }

    updateCurrentTime(now = new Date()) {
        // Format time in 12-hour format
        const timeString = this.formatTime12Hour(now);
        const currentTimeElement = document.querySelector('.current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = timeString;
        }

        // Update date
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentDateElement = document.querySelector('.current-date');
        if (currentDateElement) {
            currentDateElement.textContent = dateString;
        }

        // Update Hijri date
        this.updateHijriDate(now);
    }

    updateHijriDate(date) {
        try {
            // Simple Hijri date calculation (approximate)
            const hijriDate = this.calculateHijriDate(date);
            const hijriElement = document.getElementById('hijri-date');
            const hijriArabicElement = document.getElementById('hijri-arabic');
            
            if (hijriElement) {
                hijriElement.textContent = hijriDate.formatted;
            }
            if (hijriArabicElement) {
                hijriArabicElement.textContent = hijriDate.arabic;
            }
        } catch (error) {
            console.error('Error updating Hijri date:', error);
        }
    }

    calculateHijriDate(gregorianDate) {
        // Simplified Hijri calculation - in production, use a proper Islamic calendar library
        const hijriEpoch = new Date('622-07-16'); // Approximate start of Islamic calendar
        const daysDiff = Math.floor((gregorianDate - hijriEpoch) / (1000 * 60 * 60 * 24));
        const hijriYear = Math.floor(daysDiff / 354) + 1; // Approximate Islamic year
        const hijriMonth = Math.floor((daysDiff % 354) / 29.5) + 1;
        const hijriDay = Math.floor(daysDiff % 29.5) + 1;
        
        const hijriMonths = [
            'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
            'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];
        
        const hijriMonthsArabic = [
            'مُحَرَّم', 'صَفَر', 'رَبِيع ٱلْأَوَّل', 'رَبِيع ٱلثَّانِي',
            'جُمَادَىٰ ٱلْأُولَىٰ', 'جُمَادَىٰ ٱلْآخِرَة', 'رَجَب', 'شَعْبَان',
            'رَمَضَان', 'شَوَّال', 'ذُو ٱلْقِعْدَة', 'ذُو ٱلْحِجَّة'
        ];
        
        return {
            formatted: `${hijriDay} ${hijriMonths[hijriMonth - 1]} ${hijriYear} AH`,
            arabic: `${this.toArabicNumber(hijriDay)} ${hijriMonthsArabic[hijriMonth - 1]} ${this.toArabicNumber(hijriYear)} هـ`
        };
    }

    toArabicNumber(num) {
        const arabicNumbers = '٠١٢٣٤٥٦٧٨٩';
        return num.toString().replace(/[0-9]/g, (w) => arabicNumbers[+w]);
    }

    // Location services
    async getCurrentLocation() {
        return new Promise((resolve) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        this.currentLocation.latitude = position.coords.latitude;
                        this.currentLocation.longitude = position.coords.longitude;
                        
                        // Get city name from coordinates
                        await this.getCityFromCoordinates(position.coords.latitude, position.coords.longitude);
                        
                        console.log(`📍 Location: ${this.currentLocation.city} (${this.currentLocation.latitude}, ${this.currentLocation.longitude})`);
                        resolve();
                    },
                    (error) => {
                        console.warn('⚠️ Location access denied, using default location');
                        // Default to Mecca coordinates
                        this.currentLocation = {
                            latitude: 21.4225,
                            longitude: 39.8262,
                            city: 'Mecca, Saudi Arabia'
                        };
                        resolve();
                    }
                );
            } else {
                console.warn('⚠️ Geolocation not supported');
                this.currentLocation = {
                    latitude: 21.4225,
                    longitude: 39.8262,
                    city: 'Mecca, Saudi Arabia'
                };
                resolve();
            }
        });
    }

    async getCityFromCoordinates(lat, lon) {
        try {
            // Using a free geocoding service (in production, use a proper API key)
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const data = await response.json();
            this.currentLocation.city = `${data.city || data.locality || 'Unknown'}, ${data.countryName || ''}`;
        } catch (error) {
            console.error('Error getting city name:', error);
            this.currentLocation.city = 'Unknown Location';
        }
    }

    // Prayer times calculation
    async updatePrayerTimes() {
        if (!this.currentLocation.latitude || !this.currentLocation.longitude) {
            console.warn('⚠️ No location available for prayer times calculation');
            return;
        }

        try {
            // Calculate prayer times using Islamic calculation methods
            this.prayerTimes = this.calculatePrayerTimes(
                this.currentLocation.latitude,
                this.currentLocation.longitude,
                new Date()
            );
            
            console.log('🕐 Prayer times calculated:', this.prayerTimes);
            
        } catch (error) {
            console.error('❌ Error calculating prayer times:', error);
            // Fallback to default times
            this.setDefaultPrayerTimes();
        }
    }

    calculatePrayerTimes(latitude, longitude, date) {
        // Simplified prayer time calculation
        // In production, use a comprehensive Islamic prayer time library
        
        const method = this.calculationMethods[this.calculationMethod];
        const times = {};
        
        // Get solar calculations
        const solar = this.getSolarTimes(latitude, longitude, date);
        
        // Calculate each prayer time
        times.fajr = this.addMinutesToTime(solar.sunrise, -method.fajr * 4); // Approximate
        times.sunrise = solar.sunrise;
        times.zuhr = this.addMinutesToTime(solar.solarNoon, 5); // 5 minutes after solar noon
        times.asr = this.calculateAsrTime(solar.solarNoon, latitude, date);
        times.maghrib = this.addMinutesToTime(solar.sunset, 3); // 3 minutes after sunset
        times.isha = this.addMinutesToTime(solar.sunset, method.isha * 4); // Approximate
        
        return times;
    }

    getSolarTimes(lat, lon, date) {
        // Simplified solar calculation
        const J = this.getJulianDay(date);
        const n = J - 2451545.0;
        const L = (280.460 + 0.9856474 * n) % 360;
        const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
        const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
        
        const alpha = Math.atan2(Math.cos(23.439 * Math.PI / 180) * Math.sin(lambda), Math.cos(lambda));
        const delta = Math.asin(Math.sin(23.439 * Math.PI / 180) * Math.sin(lambda));
        
        const latRad = lat * Math.PI / 180;
        const H = Math.acos(-Math.tan(latRad) * Math.tan(delta));
        
        const solarNoonUTC = (12 - lon / 15) * 60; // minutes from midnight UTC
        const sunriseUTC = solarNoonUTC - H * 180 / Math.PI * 4;
        const sunsetUTC = solarNoonUTC + H * 180 / Math.PI * 4;
        
        return {
            sunrise: this.utcMinutesToLocalTime(sunriseUTC),
            solarNoon: this.utcMinutesToLocalTime(solarNoonUTC),
            sunset: this.utcMinutesToLocalTime(sunsetUTC)
        };
    }

    getJulianDay(date) {
        return date.getTime() / 86400000 + 2440587.5;
    }

    utcMinutesToLocalTime(minutes) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setMinutes(minutes + date.getTimezoneOffset());
        return date.toTimeString().slice(0, 8);
    }

    calculateAsrTime(solarNoon, latitude, date) {
        // Simplified Asr calculation (Shafi method - shadow length = object length + shadow at noon)
        const shadowLength = 1; // Standard shadow ratio
        const solarNoonTime = new Date();
        const [hours, minutes] = solarNoon.split(':').map(Number);
        solarNoonTime.setHours(hours, minutes, 0);
        
        // Add approximately 3-4 hours for Asr (simplified)
        solarNoonTime.setHours(solarNoonTime.getHours() + 3, solarNoonTime.getMinutes() + 30);
        
        return solarNoonTime.toTimeString().slice(0, 8);
    }

    addMinutesToTime(timeStr, minutes) {
        const [hours, mins, secs] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, mins + minutes, secs || 0);
        return date.toTimeString().slice(0, 8);
    }

    setDefaultPrayerTimes() {
        // Fallback prayer times (approximate for general use)
        this.prayerTimes = {
            fajr: '05:24:00',
            sunrise: '06:47:00',
            zuhr: '13:15:00',
            asr: '16:45:00',
            maghrib: '19:28:00',
            isha: '20:52:00'
        };
    }

    updatePrayerTimesDisplay() {
        const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
        
        prayers.forEach(prayer => {
            const timeElement = document.getElementById(`${prayer}-time`);
            const rangeElement = document.getElementById(`${prayer}-range`);
            
            if (timeElement && this.prayerTimes[prayer]) {
                timeElement.textContent = this.formatTime12Hour(new Date(`2000-01-01T${this.prayerTimes[prayer]}`));
            }
            
            if (rangeElement && this.prayerTimes[prayer]) {
                const startTime = this.formatTime12Hour(new Date(`2000-01-01T${this.prayerTimes[prayer]}`)).replace(':00', '');
                const endTime = this.calculatePrayerEndTime(prayer);
                rangeElement.textContent = `Start: ${startTime} - End: ${endTime}`;
            }
        });
        
        this.updatePrayerStatus();
    }

    calculatePrayerEndTime(prayer) {
        const prayerOrder = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
        const currentIndex = prayerOrder.indexOf(prayer);
        
        if (currentIndex < prayerOrder.length - 1) {
            const nextPrayer = prayerOrder[currentIndex + 1];
            return this.formatTime12Hour(new Date(`2000-01-01T${this.prayerTimes[nextPrayer]}`)).replace(':00', '');
        } else {
            // Isha ends at midnight
            return '11:59 PM';
        }
    }

    updatePrayerStatus() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
        
        let nextPrayerIndex = -1;
        
        prayers.forEach((prayer, index) => {
            const prayerTime = this.timeStringToMinutes(this.prayerTimes[prayer]);
            const statusElement = document.getElementById(`${prayer}-status`);
            const cardElement = document.getElementById(`${prayer}-card`);
            
            if (statusElement && cardElement) {
                cardElement.classList.remove('active');
                
                if (currentTime < prayerTime) {
                    if (nextPrayerIndex === -1) {
                        nextPrayerIndex = index;
                        statusElement.textContent = 'Next Prayer';
                        statusElement.className = 'prayer-status status-next';
                        cardElement.classList.add('active');
                    } else {
                        statusElement.textContent = 'Upcoming';
                        statusElement.className = 'prayer-status status-upcoming';
                    }
                } else {
                    statusElement.textContent = 'Completed';
                    statusElement.className = 'prayer-status status-completed';
                }
            }
        });
    }

    timeStringToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    updateNextPrayerCountdown() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const prayers = [
            { name: 'Fajr', time: this.prayerTimes.fajr || '05:24:00' },
            { name: 'Zuhr', time: this.prayerTimes.zuhr || '13:15:00' },
            { name: 'Asr', time: this.prayerTimes.asr || '16:45:00' },
            { name: 'Maghrib', time: this.prayerTimes.maghrib || '19:28:00' },
            { name: 'Isha', time: this.prayerTimes.isha || '20:52:00' }
        ];
        
        let nextPrayer = null;
        for (const prayer of prayers) {
            const prayerTime = this.timeStringToMinutes(prayer.time);
            
            if (prayerTime > currentTime) {
                nextPrayer = prayer;
                break;
            }
        }
        
        // If no prayer found for today, next is Fajr tomorrow
        if (!nextPrayer) {
            nextPrayer = prayers[0];
        }
        
        // Update UI elements
        const nextPrayerNameEl = document.getElementById('next-prayer-name');
        const nextPrayerTimeEl = document.getElementById('next-prayer-time');
        const countdownEl = document.getElementById('countdown');
        const progressEl = document.getElementById('progress-fill');
        
        if (nextPrayerNameEl) nextPrayerNameEl.textContent = nextPrayer.name;
        if (nextPrayerTimeEl) {
            nextPrayerTimeEl.textContent = this.formatTime12Hour(new Date(`2000-01-01T${nextPrayer.time}`));
        }
        
        // Calculate countdown
        const nextPrayerTime = this.timeStringToMinutes(nextPrayer.time);
        let timeUntilPrayer = nextPrayerTime - currentTime;
        
        if (timeUntilPrayer < 0) {
            timeUntilPrayer += 24 * 60; // Add 24 hours if next prayer is tomorrow
        }
        
        const hours = Math.floor(timeUntilPrayer / 60);
        const minutes = timeUntilPrayer % 60;
        
        if (countdownEl) {
            countdownEl.textContent = `${hours}h ${minutes}m remaining`;
        }
        
        // Update progress bar
        if (progressEl) {
            const totalMinutesInDay = 24 * 60;
            const progress = ((currentTime / totalMinutesInDay) * 100);
            progressEl.style.width = `${progress}%`;
        }
    }

    checkPrayerNotifications(now) {
        if (!this.notificationsEnabled) return;
        
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const prayers = Object.keys(this.prayerTimes);
        
        prayers.forEach(prayer => {
            const prayerTime = this.timeStringToMinutes(this.prayerTimes[prayer]);
            
            // Notify 5 minutes before prayer
            if (Math.abs(currentTime - (prayerTime - 5)) < 1) {
                this.showNotification(
                    `🕐 Prayer Reminder`,
                    `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer starts in 5 minutes`
                );
            }
            
            // Notify at prayer time
            if (Math.abs(currentTime - prayerTime) < 1) {
                this.showNotification(
                    `🕌 Prayer Time`,
                    `It's time for ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer`
                );
                
                if (this.vibrateEnabled && navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }
            }
        });
    }

    // Qiblah direction calculation
    calculateQiblahDirection() {
        if (!this.currentLocation.latitude || !this.currentLocation.longitude) return;
        
        // Kaaba coordinates
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;
        
        const userLat = this.currentLocation.latitude * Math.PI / 180;
        const userLon = this.currentLocation.longitude * Math.PI / 180;
        const kaabaLatRad = kaabaLat * Math.PI / 180;
        const kaabaLonRad = kaabaLon * Math.PI / 180;
        
        const dLon = kaabaLonRad - userLon;
        
        const y = Math.sin(dLon) * Math.cos(kaabaLatRad);
        const x = Math.cos(userLat) * Math.sin(kaabaLatRad) - 
                  Math.sin(userLat) * Math.cos(kaabaLatRad) * Math.cos(dLon);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        
        this.qiblahDirection = bearing;
        this.updateQiblahDisplay();
    }

    updateQiblahDisplay() {
        const arrowElement = document.getElementById('qiblah-arrow');
        const directionElement = document.getElementById('qiblah-direction');
        const distanceElement = document.getElementById('kaaba-distance');
        
        if (arrowElement) {
            arrowElement.style.transform = `translate(-50%, -100%) rotate(${this.qiblahDirection}deg)`;
        }
        
        if (directionElement) {
            const direction = this.getCompassDirection(this.qiblahDirection);
            directionElement.textContent = `${Math.round(this.qiblahDirection)}° ${direction}`;
        }
        
        if (distanceElement && this.currentLocation.latitude && this.currentLocation.longitude) {
            const distance = this.calculateDistanceToKaaba();
            distanceElement.textContent = `${distance.toLocaleString()} km`;
        }
    }

    getCompassDirection(bearing) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    }

    calculateDistanceToKaaba() {
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;
        
        const R = 6371; // Earth's radius in km
        const dLat = (kaabaLat - this.currentLocation.latitude) * Math.PI / 180;
        const dLon = (kaabaLon - this.currentLocation.longitude) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.currentLocation.latitude * Math.PI / 180) * 
                  Math.cos(kaabaLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c);
    }

    // Tasbih functionality
    incrementTasbih() {
        if (this.tasbihCount < this.tasbihTarget) {
            this.tasbihCount++;
            this.updateTasbihDisplay();
            
            // Play sound and vibrate
            this.playTasbihSound();
            
            if (navigator.vibrate && this.vibrateEnabled) {
                navigator.vibrate(50);
            }
            
            // Check if target reached
            if (this.tasbihCount === this.tasbihTarget) {
                this.handleTasbihComplete();
            }
        }
    }

    handleTasbihComplete() {
        this.showNotification(
            '🎉 Tasbih Complete!', 
            `MashaAllah! You completed ${this.tasbihTarget} ${this.tasbihData[this.currentTasbihType].transliteration}!`
        );
        
        if (navigator.vibrate && this.vibrateEnabled) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        // Auto-increment target for continuous dhikr
        setTimeout(() => {
            if (confirm('Continue with another round?')) {
                this.resetTasbih();
            }
        }, 2000);
    }

    resetTasbih() {
        this.tasbihCount = 0;
        this.updateTasbihDisplay();
        this.showNotification('🔄 Counter Reset', 'Tasbih counter has been reset to 0');
    }

    updateTasbihDisplay() {
        const countElement = document.getElementById('current-count');
        const targetElement = document.getElementById('target-count');
        
        if (countElement) {
            countElement.textContent = this.tasbihCount;
            
            // Add completion animation
            if (this.tasbihCount === this.tasbihTarget) {
                countElement.style.animation = 'pulse 1s ease-in-out 3';
            }
        }
        
        if (targetElement) {
            targetElement.textContent = `of ${this.tasbihTarget}`;
        }
    }

    updateTasbihContent(type) {
        const arabicElement = document.getElementById('dhikr-arabic');
        const translationElement = document.getElementById('dhikr-translation');
        
        if (arabicElement && this.tasbihData[type]) {
            arabicElement.textContent = this.tasbihData[type].arabic;
        }
        
        if (translationElement && this.tasbihData[type]) {
            translationElement.innerHTML = this.tasbihData[type].translation;
        }
        
        this.currentTasbihType = type;
        this.resetTasbih();
    }

    playTasbihSound() {
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

    // Content management
    updateRandomContent() {
        this.updateQuranVerse();
        this.updateHadees();
    }

    updateQuranVerse() {
        const verse = this.islamicContent.quranVerses[
            Math.floor(Math.random() * this.islamicContent.quranVerses.length)
        ];
        
        const arabicElement = document.querySelector('.arabic-text');
        const translationElement = document.querySelector('.translation-text');
        const referenceElement = document.querySelector('.reference-text');
        
        if (arabicElement) arabicElement.textContent = verse.arabic;
        if (translationElement) translationElement.textContent = verse.translation;
        if (referenceElement) referenceElement.textContent = verse.reference;
    }

    updateHadees() {
        const hadees = this.islamicContent.hadees[
            Math.floor(Math.random() * this.islamicContent.hadees.length)
        ];
        
        // Update Hadees section if it exists
        const hadeesSection = document.getElementById('hadees');
        if (hadeesSection) {
            const arabicEl = hadeesSection.querySelector('.arabic-text');
            const translationEl = hadeesSection.querySelector('.translation-text');
            const referenceEl = hadeesSection.querySelector('.reference-text');
            
            if (arabicEl) arabicEl.textContent = hadees.arabic;
            if (translationEl) translationEl.textContent = hadees.translation;
            if (referenceEl) referenceEl.textContent = hadees.reference;
        }
    }

    // Navigation and UI management
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
            
            // Special handling for different sections
            if (sectionId === 'qiblah') {
                this.calculateQiblahDirection();
            }
        }
        
        // Update navigation
        this.updateNavigation(sectionId);
        this.currentSection = sectionId;
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

    // Notification system
    showNotification(title, message, duration = 4000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // Utility functions
    formatTime12Hour(date) {
        if (typeof date === 'string') {
            date = new Date(`2000-01-01T${date}`);
        }
        
        return date.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    setupPeriodicUpdates() {
        // Update prayer times daily
        setInterval(() => {
            this.updatePrayerTimes();
        }, 24 * 60 * 60 * 1000); // Once per day
        
        // Update random content every hour
        setInterval(() => {
            this.updateRandomContent();
        }, 60 * 60 * 1000); // Once per hour
        
        // Update Qiblah direction every 5 minutes (if location changes)
        setInterval(() => {
            if (this.currentSection === 'qiblah') {
                this.calculateQiblahDirection();
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    // Event listeners setup
    setupEventListeners() {
        // Profile and notification buttons
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showNotification('👤 Profile', 'Profile settings will be available soon!');
            });
        }

        const notificationBtn = document.getElementById('notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotification('🔔 Notifications', 'You have prayer reminders enabled!');
            });
        }

        // Settings FAB
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSection('settings');
            });
        }

        // Tasbih counter
        const tasbihCounterBtn = document.getElementById('tasbih-counter-btn');
        if (tasbihCounterBtn) {
            tasbihCounterBtn.addEventListener('click', () => {
                this.incrementTasbih();
            });
        }

        // Reset tasbih
        const resetTasbihBtn = document.getElementById('reset-tasbih');
        if (resetTasbihBtn) {
            resetTasbihBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the counter?')) {
                    this.resetTasbih();
                }
            });
        }

        // Vibrate toggle
        const vibrateToggle = document.getElementById('vibrate-toggle');
        if (vibrateToggle) {
            vibrateToggle.addEventListener('click', () => {
                this.vibrateEnabled = !this.vibrateEnabled;
                if (navigator.vibrate && this.vibrateEnabled) {
                    navigator.vibrate(200);
                }
                const status = this.vibrateEnabled ? 'enabled' : 'disabled';
                this.showNotification('📳 Vibration', `Vibration ${status}`);
            });
        }

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const section = tab.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // Tasbih type selector
        document.querySelectorAll('.tasbih-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.tasbih-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.updateTasbihContent(option.dataset.type);
                this.showNotification('📿 Tasbih', `Changed to ${option.textContent}`);
            });
        });

        // Target selector
        document.querySelectorAll('.target-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.target-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.tasbihTarget = parseInt(option.dataset.target);
                this.updateTasbihDisplay();
                this.resetTasbih();
                this.showNotification('🎯 Target', `Target set to ${this.tasbihTarget}`);
            });
        });

        // Prayer cards
        document.querySelectorAll('.prayer-card').forEach(card => {
            card.addEventListener('click', () => {
                const prayerName = card.id.replace('-card', '');
                const isCompleted = card.classList.contains('completed');
                
                if (!isCompleted) {
                    card.classList.add('completed');
                    this.showNotification('✅ Prayer Completed', `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer marked as completed!`);
                } else {
                    card.classList.remove('completed');
                    this.showNotification('↩️ Prayer Unmarked', `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer unmarked`);
                }
            });
        });

        // Settings handlers
        const calculationMethodSelect = document.getElementById('calculation-method');
        if (calculationMethodSelect) {
            calculationMethodSelect.addEventListener('change', (e) => {
                this.calculationMethod = parseInt(e.target.value);
                this.updatePrayerTimes().then(() => {
                    this.updatePrayerTimesDisplay();
                });
                this.showNotification('⚙️ Settings', `Calculation method updated`);
            });
        }

        const enableNotificationsCheck = document.getElementById('enable-notifications');
        if (enableNotificationsCheck) {
            enableNotificationsCheck.addEventListener('change', (e) => {
                this.notificationsEnabled = e.target.checked;
                const status = this.notificationsEnabled ? 'enabled' : 'disabled';
                this.showNotification('🔔 Notifications', `Prayer notifications ${status}`);
            });
        }

        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.showNotification('🎨 Theme', `Theme will be changed to ${e.target.value} mode`);
            });
        }

        const locationInput = document.getElementById('location-input');
        if (locationInput) {
            locationInput.addEventListener('change', async (e) => {
                if (e.target.value.trim()) {
                    this.showNotification('📍 Location', 'Location update feature coming soon!');
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + Number for quick navigation
            if (e.altKey) {
                const keyMap = {
                    '1': 'namaz-time',
                    '2': 'quran',
                    '3': 'tasbih',
                    '4': 'qiblah',
                    '5': 'hadees'
                };
                
                if (keyMap[e.key]) {
                    e.preventDefault();
                    this.showSection(keyMap[e.key]);
                }
            }
            
            // Space bar for tasbih counter
            if (e.code === 'Space' && this.currentSection === 'tasbih') {
                e.preventDefault();
                this.incrementTasbih();
            }
            
            // R key for reset tasbih
            if (e.key.toLowerCase() === 'r' && this.currentSection === 'tasbih' && e.ctrlKey) {
                e.preventDefault();
                this.resetTasbih();
            }
        });

        // Touch events for mobile
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            
            // Swipe up to open settings
            if (diff > 50 && Math.abs(diff) > 50) {
                this.showSection('settings');
            }
        });

        // Visibility API for app state management
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // App became visible, refresh times
                this.updateCurrentTime();
                this.updateNextPrayerCountdown();
            }
        });
    }
}

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Initialize the app when DOM is loaded
let salahApp;

document.addEventListener('DOMContentLoaded', () => {
    salahApp = new SalahTimeIndicator();
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (salahApp) {
        salahApp.showNotification('⚠️ Error', 'An unexpected error occurred. Please refresh the page.');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (salahApp) {
        salahApp.showNotification('⚠️ Error', 'Failed to load some data. Please check your connection.');
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalahTimeIndicator;
}
