const API_KEY = '7709ea6fb25d40614a0e1bb9a7231449'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

async function getWeatherData(cityName) {
    try {
        const response = await fetch(`${BASE_URL}?q=${cityName}&appid=${API_KEY}&units=metric&lang=el`);
        
        if (!response.ok) {
            throw new Error('Η πόλη δεν βρέθηκε');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Σφάλμα:', error);
        throw error;
    }
}
async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=el`);
        
        if (!response.ok) {
            throw new Error('Δεν βρέθηκε καιρός για αυτή την τοποθεσία');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Σφάλμα:', error);
        throw error;
    }
}