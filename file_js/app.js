//-------------------- DOM Elements-------------------------------
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const humidityElement = document.getElementById('humidity');
const windElement = document.getElementById('wind');

//---------------- Map variables----------------------------------
let map;
let marker;

//---------------- Event Listeners--------------------------------
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
locationBtn.addEventListener('click', handleLocationClick);

// Window resize event
window.addEventListener('resize', handleMapResize);

// Load weather for default city when page loads
document.addEventListener('DOMContentLoaded', () => {
    
    initMap();
    cityInput.value = 'Athens';
    handleSearch();
});

//---------- Main Functions------------------------------------
async function handleSearch() {
    const city = cityInput.value.trim();

    if (!city) {
        showError('Παρακαλώ εισάγετε μια πόλη');
        return;
    }

    try {
        showLoading();
        const weatherData = await getWeatherData(city);
        console.log('Weather data:', weatherData); 
        
        updateWeatherUI(weatherData);

    } catch (error) {
        console.error('Σφάλμα:', error);
        showError('Δεν βρέθηκε η πόλη. Δοκιμάστε ξανά.');
    }
}

// Update loading state για location button
async function handleLocationClick() {
    try {
        
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<div class="loading-spinner"></div>';

        const position = await getCurrentLocation();
        const weatherData = await getWeatherByCoords(position.lat, position.lon);

        cityInput.value = weatherData.name;
        updateWeatherUI(weatherData);

    } catch (error) {
        console.error('Σφάλμα γεωлокаλισμού:', error);
        showError(error.message);
        removeLoading();
        cityInput.value = '';
    } finally {
        
        locationBtn.disabled = false;
        locationBtn.innerHTML = '<img src="pictures/icons/location.svg" alt="My Location" class="icon">';
    }
}

function updateWeatherUI(data) {
    const cityName = data.name;
    const country = data.sys.country;
    const temp = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const iconCode = data.weather[0].icon;
    const weatherId = data.weather[0].id;
    const lat = data.coord.lat;
    const lon = data.coord.lon;

    // Day/Night detection 
    const isDay = isDaytime(data.sys.sunrise, data.sys.sunset, data.timezone);
    console.log(`Is daytime: ${isDay}, Sunrise: ${new Date(data.sys.sunrise * 1000)}, Sunset: ${new Date(data.sys.sunset * 1000)}, Timezone: ${data.timezone}`);


    // Update background based on weather
    const newBackground = getBackgroundByWeather(weatherId, isDay);
    updateBackground(newBackground);

    // Ενημέρωση πληροφοριών καιρού
    locationElement.textContent = `${cityName}, ${country}`;
    temperatureElement.textContent = `${temp}°C`;
    descriptionElement.textContent = capitalizeFirstLetter(description);
    humidityElement.textContent = `${humidity}%`;
    windElement.textContent = `${windSpeed} km/h`;

    updateTimeInfo(isDay, data.timezone);
    startTimeUpdates(data.timezone);
    updateWeatherIcon(iconCode);
    updateMap(lat, lon, cityName);
    removeLoading();

}

//---------------------------- Weather Functions-----------------------
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Η γεωπокαλισμός δεν υποστηρίζεται από το browser σου'));
            return;
        }

        showLoading();
        cityInput.value = 'Αναζήτηση τοποθεσίας...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                resolve({ lat, lon });
            },
            (error) => {
                let errorMessage = 'Δεν μπορέσαμε να βρούμε την τοποθεσία σου';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Αρνηθήκατε την άδεια για γεωπокαλισμό';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Οι πληροφορίες τοποθεσίας δεν είναι διαθέσιμες';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Το αίτημα τοποθεσίας έληξε';
                        break;
                }

                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

function showLoading() {
    locationElement.textContent = 'Αναζήτηση...';
    temperatureElement.textContent = '--°C';
    descriptionElement.textContent = '--';
    humidityElement.textContent = '--%';
    windElement.textContent = '-- km/h';
}

function removeLoading() {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.classList.remove('loading'));
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 10px;
        backdrop-filter: blur(10px);
        z-index: 1000;
        max-width: 300px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);

    cityInput.focus();
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getBackgroundByWeather(weatherId, isDaytime = true) {
    const weatherCode = parseInt(weatherId);

    // Clear/Clear sky
    if (weatherCode === 800) {
        return isDaytime
            ? 'linear-gradient(135deg, #667eea, #764ba2)'  // Bright purple-blue για ημέρα
            : 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)';  // Deep night blue
    }

    // Clouds
    if (weatherCode >= 801 && weatherCode <= 804) {
        return isDaytime
            ? 'linear-gradient(135deg, #636fa4, #a8c0ff)'  // Soft blue-grey για ημέρα
            : 'linear-gradient(135deg, #2c3e50, #4a6491)';  // Dark blue-grey για νύχτα
    }

    // Rain
    if (weatherCode >= 500 && weatherCode <= 531) {
        return isDaytime
            ? 'linear-gradient(135deg, #4da0ff, #2c3e50)'  // Stormy blue για ημέρα
            : 'linear-gradient(135deg, #1e3c72, #2a5298)';  // Dark storm blue για νύχτα
    }

    // Thunderstorm
    if (weatherCode >= 200 && weatherCode <= 232) {
        return 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)';  // Dramatic dark purple
    }

    // Snow
    if (weatherCode >= 600 && weatherCode <= 622) {
        return isDaytime
            ? 'linear-gradient(135deg, #e6e9f0, #abb0b8)'  // Silver-white για ημέρα
            : 'linear-gradient(135deg, #bdc3c7, #2c3e50)';  // Cool grey για νύχτα
    }

    // Fog/Mist
    if (weatherCode >= 701 && weatherCode <= 781) {
        return isDaytime
            ? 'linear-gradient(135deg, #757f9a, #d7dde8)'  // Light mist
            : 'linear-gradient(135deg, #485563, #29323c)';  // Dark mist
    }

    // Default fallback
    return isDaytime
        ? 'linear-gradient(135deg, #74b9ff, #0984e3)'  // Default blue για ημέρα
        : 'linear-gradient(135deg, #1e3c72, #2a5298)';  // Dark blue για νύχτα
}

// Function to check if it's daytime (ALTERNATIVE - more reliable)
function isDaytime(sunrise, sunset, timezoneOffset) {
    // Get current time in the city's timezone
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + (timezoneOffset * 1000));

    const cityHours = cityTime.getHours();

    // Consider daytime from 6:00 to 20:00 local time
    return cityHours >= 6 && cityHours < 20;
}

// Function to update background with smooth transition
function updateBackground(backgroundGradient) {
    const appContainer = document.querySelector('.app-container');

    // Smooth transition effect
    appContainer.style.transition = 'background 1.5s ease-in-out';
    appContainer.style.background = backgroundGradient;

    // After transition, remove the transition property
    setTimeout(() => {
        appContainer.style.transition = '';
    }, 1500);
}

// ------------ Map Functions---------------------------

function initMap() {
    map = L.map('weather-map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    console.log("Ο χάρτης αρχικοποιήθηκε");
}

function updateMap(lat, lon, cityName) {
    if (marker) {
        map.removeLayer(marker);
    }

    const zoomLevel = window.innerWidth <= 768 ? 9 : 10;

    map.setView([lat, lon], zoomLevel);

    marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${cityName}</b>`)
        .openPopup();

    handleMapResize();
}

// Function to handle responsive map
function handleMapResize() {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
            console.log('Χάρτης responsive resize');
        }, 100);
    }
}

// Function to scroll to map (mobile only)
function scrollToMap() {
    if (window.innerWidth <= 768) {
        const mapSection = document.querySelector('.map-section');
        if (mapSection) {
            mapSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}

// Function to adjust map height for mobile
function adjustMapHeight() {
    if (window.innerWidth <= 768) {
        const mapContainer = document.getElementById('weather-map');
        const mapSection = document.querySelector('.map-section');

        if (mapContainer && mapSection) {
            const availableHeight = mapSection.offsetHeight - 40; 
            mapContainer.style.height = availableHeight + 'px';

            // Re-initialize map size
            if (map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }
        }
    }
}

//------------------ Time Functions----------------------

// Function to get day/night status text
function getDayNightStatus(isDaytime) {
    return isDaytime ? 'Μέρα' : 'Νύχτα';
}

// Function to format local time
function formatLocalTime(timezoneOffset) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + (timezoneOffset * 1000));

    return cityTime.toLocaleTimeString('el-GR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function updateTimeInfo(isDaytime, timezoneOffset) {
    const timeSymbolIcon = document.getElementById('time-symbol-icon');
    const dayNightElement = document.getElementById('day-night-status');
    const localTimeElement = document.getElementById('local-time');

    if (timeSymbolIcon && dayNightElement && localTimeElement) {
        // Αλλαγή εικόνας based on day/night
        timeSymbolIcon.src = getTimeIcon(isDaytime);
        timeSymbolIcon.alt = isDaytime ? 'Day' : 'Night';

        dayNightElement.textContent = getDayNightStatus(isDaytime);
        localTimeElement.textContent = formatLocalTime(timezoneOffset);
    }
}

function startTimeUpdates(timezoneOffset) {
    // Update every minute
    setInterval(() => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const cityTime = new Date(utc + (timezoneOffset * 1000));
        const cityHours = cityTime.getHours();
        const isDay = cityHours >= 6 && cityHours < 20;

        updateTimeInfo(isDay, timezoneOffset);
    }, 60000);
}

function getTimeIcon(isDaytime) {
    return isDaytime ? 'pictures/icons/sun.svg' : 'pictures/icons/moon.svg';
}

//------------------------Weather Icon---------------
function updateWeatherIcon(iconCode) {
    const iconElement = document.getElementById('weather-icon');
    iconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconElement.style.display = 'block';
}
