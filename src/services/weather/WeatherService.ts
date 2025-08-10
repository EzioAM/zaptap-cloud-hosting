import * as Location from 'expo-location';
import { EventLogger } from '../../utils/EventLogger';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import WeatherKitService from './WeatherKitService';

export type WeatherCondition = 
  | 'clear' 
  | 'clouds' 
  | 'rain' 
  | 'drizzle' 
  | 'thunderstorm' 
  | 'snow' 
  | 'mist' 
  | 'fog';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
  cloudCoverage: number;
  rainIntensity?: number;
  snowIntensity?: number;
  thunderstorm?: boolean;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

class WeatherService {
  private static instance: WeatherService;
  private cache: CachedWeather | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  // You can get a free API key from https://openweathermap.org/api
  // For now using a demo key that provides limited access
  private readonly OPENWEATHER_API_KEY = Constants.expoConfig?.extra?.openWeatherApiKey || 'demo';
  private locationPermissionStatus: Location.PermissionStatus | null = null;

  private constructor() {}

  static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  async getCurrentWeather(): Promise<WeatherData> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        EventLogger.debug('WeatherService', 'Using cached weather data');
        console.log('[WeatherService] Using cached weather:', this.cache.data);
        return this.cache.data;
      }

      // Try WeatherKit first on iOS
      if (Platform.OS === 'ios') {
        console.log('[WeatherService] Attempting to use WeatherKit...');
        const weatherKitData = await WeatherKitService.getCurrentWeather();
        if (weatherKitData) {
          console.log('[WeatherService] WeatherKit data received:', weatherKitData);
          
          // Cache the result
          this.cache = {
            data: weatherKitData,
            timestamp: Date.now(),
            location: { latitude: 0, longitude: 0 } // WeatherKit handles location internally
          };
          
          return weatherKitData;
        }
        console.log('[WeatherService] WeatherKit not available, falling back to standard API');
      }

      // Fall back to standard weather API flow
      const location = await this.getLocation();
      console.log('[WeatherService] Location obtained:', location ? 'Yes' : 'No');
      if (!location) {
        console.log('[WeatherService] Using fallback weather (no location)');
        return this.getFallbackWeather();
      }

      // Use OpenWeatherMap or simulated data
      const weatherData = await this.fetchWeatherData(location.coords.latitude, location.coords.longitude);
      console.log('[WeatherService] Weather data generated:', weatherData);
      
      // Cache the result
      this.cache = {
        data: weatherData,
        timestamp: Date.now(),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      };

      return weatherData;
    } catch (error) {
      EventLogger.error('WeatherService', 'Failed to get weather data:', error as Error);
      return this.getFallbackWeather();
    }
  }

  private async getLocation(): Promise<Location.LocationObject | null> {
    try {
      // Check if we already have permission
      if (!this.locationPermissionStatus) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        this.locationPermissionStatus = status;
      }

      if (this.locationPermissionStatus !== 'granted') {
        EventLogger.debug('WeatherService', 'Location permission not granted');
        return null;
      }

      // Get current location with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);

      return location;
    } catch (error) {
      EventLogger.error('WeatherService', 'Failed to get location:', error as Error);
      return null;
    }
  }

  private async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      // If we don't have a real API key, use simulated data
      if (this.OPENWEATHER_API_KEY === 'demo') {
        return this.getSimulatedWeather();
      }

      // Call OpenWeatherMap API
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${this.OPENWEATHER_API_KEY}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.log('[WeatherService] API call failed, using simulated weather');
        return this.getSimulatedWeather();
      }

      const data = await response.json();
      
      // Parse the API response
      const main = data.weather?.[0]?.main?.toLowerCase() || 'clear';
      const description = data.weather?.[0]?.description || 'Clear sky';
      const temp = Math.round(data.main?.temp || 20);
      const humidity = data.main?.humidity || 65;
      const windSpeed = Math.round((data.wind?.speed || 5) * 3.6); // Convert m/s to km/h
      const clouds = data.clouds?.all || 0;
      
      // Determine time of day based on sunrise/sunset
      const now = Date.now() / 1000;
      const isDay = now > data.sys?.sunrise && now < data.sys?.sunset;
      
      // Map OpenWeatherMap conditions to our WeatherCondition types
      let condition: WeatherCondition = 'clear';
      if (main.includes('thunderstorm')) condition = 'thunderstorm';
      else if (main.includes('drizzle')) condition = 'drizzle';
      else if (main.includes('rain')) condition = 'rain';
      else if (main.includes('snow')) condition = 'snow';
      else if (main.includes('mist')) condition = 'mist';
      else if (main.includes('fog')) condition = 'fog';
      else if (main.includes('cloud')) condition = 'clouds';
      else if (clouds > 50) condition = 'clouds';
      
      const weatherData: WeatherData = {
        condition,
        temperature: temp,
        description: description.charAt(0).toUpperCase() + description.slice(1),
        humidity,
        windSpeed,
        isDay,
        cloudCoverage: clouds,
        thunderstorm: condition === 'thunderstorm'
      };

      // Add intensity based on actual data
      if (condition === 'rain' || condition === 'drizzle') {
        const rain1h = data.rain?.['1h'] || 0;
        weatherData.rainIntensity = Math.min(1, rain1h / 10); // Normalize to 0-1
      }
      if (condition === 'snow') {
        const snow1h = data.snow?.['1h'] || 0;
        weatherData.snowIntensity = Math.min(1, snow1h / 10); // Normalize to 0-1
      }

      console.log('[WeatherService] Real weather data fetched:', weatherData);
      return weatherData;
      
    } catch (error) {
      console.error('[WeatherService] Error fetching real weather:', error);
      return this.getSimulatedWeather();
    }
  }

  private getSimulatedWeather(): WeatherData {
    // Fallback to simulated weather when API is unavailable
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 20;
    
    // Simulate different weather conditions with weighted randomness
    const conditions: Array<{ condition: WeatherCondition; weight: number }> = [
      { condition: 'clear', weight: 30 },
      { condition: 'clouds', weight: 25 },
      { condition: 'rain', weight: 20 },
      { condition: 'drizzle', weight: 10 },
      { condition: 'thunderstorm', weight: 5 },
      { condition: 'mist', weight: 5 },
      { condition: 'fog', weight: 5 }
    ];

    // Add snow in winter months (Northern Hemisphere assumption)
    const month = new Date().getMonth();
    if (month === 11 || month === 0 || month === 1) {
      conditions.push({ condition: 'snow', weight: 15 });
    }

    const selectedCondition = this.weightedRandom(conditions);
    
    // Generate realistic data based on condition
    const baseTemp = 20; // Base temperature in Celsius
    const tempVariation = Math.random() * 10 - 5;
    
    const weatherData: WeatherData = {
      condition: selectedCondition,
      temperature: Math.round(baseTemp + tempVariation),
      description: this.getDescription(selectedCondition),
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed: Math.round(5 + Math.random() * 15),
      isDay,
      cloudCoverage: this.getCloudCoverage(selectedCondition),
      thunderstorm: selectedCondition === 'thunderstorm'
    };

    // Add intensity for precipitation
    if (selectedCondition === 'rain' || selectedCondition === 'drizzle') {
      weatherData.rainIntensity = selectedCondition === 'rain' ? 0.5 + Math.random() * 0.5 : 0.1 + Math.random() * 0.3;
    }
    if (selectedCondition === 'snow') {
      weatherData.snowIntensity = 0.3 + Math.random() * 0.7;
    }

    console.log('[WeatherService] Using simulated weather:', weatherData);
    return weatherData;
  }

  private weightedRandom(items: Array<{ condition: WeatherCondition; weight: number }>): WeatherCondition {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.condition;
      }
    }
    
    return 'clear';
  }

  private getDescription(condition: WeatherCondition): string {
    const descriptions: Record<WeatherCondition, string[]> = {
      clear: ['Clear sky', 'Sunny', 'Bright and clear'],
      clouds: ['Partly cloudy', 'Overcast', 'Cloudy'],
      rain: ['Light rain', 'Moderate rain', 'Rainy'],
      drizzle: ['Light drizzle', 'Drizzling', 'Misty rain'],
      thunderstorm: ['Thunderstorm', 'Storm with lightning', 'Heavy thunderstorm'],
      snow: ['Light snow', 'Snowing', 'Heavy snowfall'],
      mist: ['Misty', 'Light mist', 'Foggy conditions'],
      fog: ['Foggy', 'Dense fog', 'Low visibility']
    };

    const options = descriptions[condition];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getCloudCoverage(condition: WeatherCondition): number {
    const coverage: Record<WeatherCondition, [number, number]> = {
      clear: [0, 10],
      clouds: [40, 80],
      rain: [70, 100],
      drizzle: [60, 90],
      thunderstorm: [90, 100],
      snow: [80, 100],
      mist: [50, 70],
      fog: [90, 100]
    };

    const [min, max] = coverage[condition];
    return Math.round(min + Math.random() * (max - min));
  }

  private getFallbackWeather(): WeatherData {
    // Return pleasant default weather when location/API unavailable
    return {
      condition: 'clouds',
      temperature: 22,
      description: 'Partly cloudy',
      humidity: 65,
      windSpeed: 10,
      isDay: new Date().getHours() >= 6 && new Date().getHours() < 20,
      cloudCoverage: 40
    };
  }

  // Force refresh weather data
  async refreshWeather(): Promise<WeatherData> {
    this.cache = null;
    return this.getCurrentWeather();
  }

  // Get simple weather emoji for UI
  getWeatherEmoji(condition: WeatherCondition, isDay: boolean): string {
    const emojis: Record<WeatherCondition, { day: string; night: string }> = {
      clear: { day: '☀️', night: '🌙' },
      clouds: { day: '⛅', night: '☁️' },
      rain: { day: '🌧️', night: '🌧️' },
      drizzle: { day: '🌦️', night: '🌦️' },
      thunderstorm: { day: '⛈️', night: '⛈️' },
      snow: { day: '❄️', night: '❄️' },
      mist: { day: '🌫️', night: '🌫️' },
      fog: { day: '🌁', night: '🌁' }
    };

    return emojis[condition]?.[isDay ? 'day' : 'night'] || '☁️';
  }
}

export default WeatherService.getInstance();