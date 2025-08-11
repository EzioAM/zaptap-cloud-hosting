import { Platform, NativeModules } from 'react-native';
import * as Location from 'expo-location';
import { EventLogger } from '../../utils/EventLogger';
import { WeatherData, WeatherCondition } from './WeatherService';
import { supabase } from '../supabase/client';

// WeatherKit native module interface
interface WeatherKitModule {
  isAvailable(): Promise<boolean>;
  setAuthToken(token: string): Promise<void>;
  fetchCurrentWeather(latitude: number, longitude: number): Promise<any>;
  fetchHourlyForecast(latitude: number, longitude: number, hours: number): Promise<any>;
  fetchDailyForecast(latitude: number, longitude: number, days: number): Promise<any>;
}

// JWT token response from server
interface WeatherKitJWT {
  token: string;
  expiresIn: number;
  expiresAt: string;
}

// WeatherKit response types based on Apple's API
interface WeatherKitCurrent {
  temperature: number; // Celsius
  apparentTemperature: number;
  humidity: number; // 0-1
  pressure: number; // millibars
  windSpeed: number; // km/h
  windDirection: number; // degrees
  cloudCover: number; // 0-1
  uvIndex: number;
  visibility: number; // meters
  conditionCode: string; // Apple's condition codes
  isDaylight: boolean;
  precipitationIntensity?: number;
}

/**
 * WeatherKit Service for iOS
 * Uses Apple's native WeatherKit framework for high-quality weather data
 * Requires iOS 16+ and active Apple Developer account
 */
class WeatherKitService {
  private static instance: WeatherKitService;
  private weatherKitModule: WeatherKitModule | null = null;
  private cache: { data: WeatherData; timestamp: number } | null = null;
  private jwtCache: { token: string; expiresAt: Date } | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly JWT_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh JWT 5 minutes before expiry

  private constructor() {
    // Only initialize on iOS
    if (Platform.OS === 'ios') {
      this.weatherKitModule = NativeModules.WeatherKitModule;
    }
  }

  static getInstance(): WeatherKitService {
    if (!WeatherKitService.instance) {
      WeatherKitService.instance = new WeatherKitService();
    }
    return WeatherKitService.instance;
  }

  /**
   * Check if WeatherKit is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    if (!this.weatherKitModule) {
      EventLogger.debug('WeatherKit', 'Native module not found');
      return false;
    }

    try {
      const available = await this.weatherKitModule.isAvailable();
      EventLogger.debug('WeatherKit', `Availability: ${available}`);
      return available;
    } catch (error) {
      EventLogger.error('WeatherKit', 'Failed to check availability:', error as Error);
      return false;
    }
  }

  /**
   * Get or refresh JWT token for WeatherKit authentication
   */
  private async getJWTToken(): Promise<string | null> {
    try {
      // Check if we have a valid cached token
      if (this.jwtCache && this.jwtCache.expiresAt > new Date(Date.now() + this.JWT_REFRESH_BUFFER)) {
        EventLogger.debug('WeatherKit', 'Using cached JWT token');
        return this.jwtCache.token;
      }

      // Fetch new token from Supabase Edge Function
      EventLogger.debug('WeatherKit', 'Fetching new JWT token from server');
      
      const { data, error } = await supabase.functions.invoke('weatherkit-jwt', {
        body: { duration: 3600 } // Request 1 hour token
      });

      if (error) {
        // Don't log as error if it's just not configured yet
        if (error.message?.includes('401') || error.message?.includes('not found')) {
          EventLogger.debug('WeatherKit', 'WeatherKit Edge Function not configured');
        } else {
          EventLogger.error('WeatherKit', 'Failed to fetch JWT token:', error);
        }
        return null;
      }

      if (data && data.token) {
        // Cache the token
        this.jwtCache = {
          token: data.token,
          expiresAt: new Date(data.expiresAt)
        };
        
        EventLogger.info('WeatherKit', 'JWT token fetched successfully', {
          expiresAt: data.expiresAt
        });
        
        return data.token;
      }

      return null;
    } catch (error) {
      EventLogger.error('WeatherKit', 'Error getting JWT token:', error as Error);
      return null;
    }
  }

  /**
   * Fetch current weather using WeatherKit
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        EventLogger.debug('WeatherKit', 'Using cached weather data');
        return this.cache.data;
      }

      // Check availability
      const available = await this.isAvailable();
      if (!available) {
        EventLogger.debug('WeatherKit', 'WeatherKit not available');
        return null;
      }

      // Get JWT token for authentication
      const token = await this.getJWTToken();
      if (!token) {
        EventLogger.warn('WeatherKit', 'No JWT token available, falling back');
        return null;
      }

      // Set the authentication token in the native module
      if (this.weatherKitModule && this.weatherKitModule.setAuthToken) {
        await this.weatherKitModule.setAuthToken(token);
      }

      // Get current location
      const location = await this.getLocation();
      if (!location) {
        EventLogger.debug('WeatherKit', 'Location not available');
        return null;
      }

      // Fetch weather from WeatherKit
      const weatherData = await this.fetchWeatherData(
        location.coords.latitude,
        location.coords.longitude
      );

      if (weatherData) {
        // Cache the result
        this.cache = {
          data: weatherData,
          timestamp: Date.now()
        };
      }

      return weatherData;
    } catch (error) {
      EventLogger.error('WeatherKit', 'Failed to get weather:', error as Error);
      return null;
    }
  }

  /**
   * Get current location
   */
  private async getLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      EventLogger.error('WeatherKit', 'Failed to get location:', error as Error);
      return null;
    }
  }

  /**
   * Fetch weather data from WeatherKit native module
   */
  private async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData | null> {
    if (!this.weatherKitModule) {
      return null;
    }

    try {
      const current: WeatherKitCurrent = await this.weatherKitModule.fetchCurrentWeather(
        latitude,
        longitude
      );

      // Map WeatherKit condition codes to our WeatherCondition type
      const condition = this.mapConditionCode(current.conditionCode);

      const weatherData: WeatherData = {
        condition,
        temperature: Math.round(current.temperature),
        description: this.getDescription(current.conditionCode),
        humidity: Math.round(current.humidity * 100), // Convert 0-1 to percentage
        windSpeed: Math.round(current.windSpeed),
        isDay: current.isDaylight,
        cloudCoverage: Math.round(current.cloudCover * 100),
        thunderstorm: condition === 'thunderstorm',
        rainIntensity: current.precipitationIntensity && condition === 'rain' 
          ? Math.min(1, current.precipitationIntensity / 10) 
          : undefined,
        snowIntensity: current.precipitationIntensity && condition === 'snow'
          ? Math.min(1, current.precipitationIntensity / 10)
          : undefined,
      };

      EventLogger.info('WeatherKit', 'Weather data fetched:', {
        condition: weatherData.condition,
        temp: weatherData.temperature,
        description: weatherData.description
      });

      return weatherData;
    } catch (error) {
      // Only log as error if it's not an auth issue
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('401') || errorMessage.includes('JWT')) {
        EventLogger.debug('WeatherKit', 'Weather service not configured or authenticated');
      } else {
        EventLogger.error('WeatherKit', 'Failed to fetch weather data:', error as Error);
      }
      return null;
    }
  }

  /**
   * Map WeatherKit condition codes to our WeatherCondition type
   * Based on Apple's SF Symbols weather conditions
   */
  private mapConditionCode(code: string): WeatherCondition {
    const codeMap: Record<string, WeatherCondition> = {
      // Clear
      'Clear': 'clear',
      'MostlyClear': 'clear',
      
      // Cloudy
      'Cloudy': 'clouds',
      'MostlyCloudy': 'clouds',
      'PartlyCloudy': 'clouds',
      'ScatteredClouds': 'clouds',
      
      // Rain
      'Rain': 'rain',
      'HeavyRain': 'rain',
      'IsolatedThunderstorms': 'thunderstorm',
      'ScatteredThunderstorms': 'thunderstorm',
      'StrongThunderstorms': 'thunderstorm',
      'Thunderstorms': 'thunderstorm',
      'Drizzle': 'drizzle',
      'FreezingDrizzle': 'drizzle',
      'FreezingRain': 'rain',
      
      // Snow
      'Snow': 'snow',
      'HeavySnow': 'snow',
      'Flurries': 'snow',
      'Sleet': 'snow',
      'MixedRainAndSleet': 'snow',
      'MixedRainAndSnow': 'snow',
      'MixedSnowAndSleet': 'snow',
      'Blizzard': 'snow',
      'BlowingSnow': 'snow',
      
      // Fog/Mist
      'Fog': 'fog',
      'Haze': 'mist',
      'Smoky': 'mist',
      'Breezy': 'clouds',
      'Windy': 'clouds',
      
      // Other
      'Dust': 'mist',
      'Sand': 'mist',
      'Hot': 'clear',
      'Cold': 'clear',
      'Hurricane': 'thunderstorm',
      'TropicalStorm': 'thunderstorm',
    };

    return codeMap[code] || 'clouds';
  }

  /**
   * Get human-readable description for condition code
   */
  private getDescription(code: string): string {
    const descriptions: Record<string, string> = {
      'Clear': 'Clear sky',
      'MostlyClear': 'Mostly clear',
      'PartlyCloudy': 'Partly cloudy',
      'MostlyCloudy': 'Mostly cloudy',
      'Cloudy': 'Cloudy',
      'ScatteredClouds': 'Scattered clouds',
      'Rain': 'Rain',
      'HeavyRain': 'Heavy rain',
      'Drizzle': 'Light drizzle',
      'FreezingDrizzle': 'Freezing drizzle',
      'FreezingRain': 'Freezing rain',
      'Snow': 'Snow',
      'HeavySnow': 'Heavy snow',
      'Flurries': 'Snow flurries',
      'Sleet': 'Sleet',
      'MixedRainAndSnow': 'Mixed rain and snow',
      'Thunderstorms': 'Thunderstorms',
      'IsolatedThunderstorms': 'Isolated thunderstorms',
      'ScatteredThunderstorms': 'Scattered thunderstorms',
      'StrongThunderstorms': 'Strong thunderstorms',
      'Fog': 'Foggy',
      'Haze': 'Hazy',
      'Smoky': 'Smoky',
      'Breezy': 'Breezy',
      'Windy': 'Windy',
      'Hurricane': 'Hurricane conditions',
      'TropicalStorm': 'Tropical storm',
      'Blizzard': 'Blizzard conditions',
      'BlowingSnow': 'Blowing snow',
    };

    return descriptions[code] || 'Partly cloudy';
  }

  /**
   * Force refresh weather data
   */
  async refreshWeather(): Promise<WeatherData | null> {
    this.cache = null;
    this.jwtCache = null; // Also refresh JWT token
    return this.getCurrentWeather();
  }
}

export default WeatherKitService.getInstance();