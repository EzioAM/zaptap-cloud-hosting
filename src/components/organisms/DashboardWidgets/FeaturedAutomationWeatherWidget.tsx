import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Animated,
  StyleProp,
  ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetFeaturedAutomationQuery } from '../../../store/api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';
import WeatherEffects from '../../weather/WeatherEffects';
import WeatherService, { WeatherData } from '../../../services/weather/WeatherService';
import { EventLogger } from '../../../utils/EventLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FeaturedAutomationWeatherWidget: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { data: featured, isLoading, error, refetch } = useGetFeaturedAutomationQuery();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  
  // Animation refs for smooth effects
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  console.log('[FeaturedAutomationWeatherWidget] Component mounted, weather state:', weather);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      console.log('[FeaturedAutomationWeatherWidget] Fetching weather...');
      try {
        setWeatherLoading(true);
        const weatherData = await WeatherService.getCurrentWeather();
        console.log('[FeaturedAutomationWeatherWidget] Weather fetched:', weatherData);
        setWeather(weatherData);
        EventLogger.info('WeatherWidget', 'Weather data loaded:', { 
          condition: weatherData.condition, 
          temp: weatherData.temperature 
        });
      } catch (error) {
        EventLogger.error('WeatherWidget', 'Failed to load weather:', error as Error);
        // Use fallback weather
        setWeather({
          condition: 'clouds',
          temperature: 22,
          description: 'Partly cloudy',
          humidity: 65,
          windSpeed: 10,
          isDay: new Date().getHours() >= 6 && new Date().getHours() < 20,
          cloudCoverage: 40
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Subtle pulse animation for the card
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);
  
  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, weatherLoading]);

  // Log the featured automation data for debugging
  useEffect(() => {
    if (featured) {
      console.log('[FeaturedWidget] Displaying automation:', {
        id: featured.id,
        title: featured.title,
        description: featured.description?.substring(0, 50) + '...',
        category: featured.category,
        author: featured.author || featured.user?.name,
        likes: featured.likesCount,
        downloads: featured.downloadsCount,
        rating: featured.rating,
        isTrending: featured.isTrending
      });
    }
  }, [featured]);
  
  // Refresh featured automation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[FeaturedWidget] Refreshing featured automation...');
      refetch();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [refetch]);

  const categoryColors: Record<string, string[]> = {
    'Productivity': ['#6366F1', '#818CF8'],
    'Smart Home': ['#10B981', '#34D399'],
    'Social': ['#EC4899', '#F472B6'],
    'Health': ['#F59E0B', '#FCD34D'],
    'Entertainment': ['#8B5CF6', '#A78BFA'],
    'Finance': ['#06B6D4', '#67E8F9'],
    'Travel': ['#FF6B6B', '#FF8E53'],
    'Education': ['#667EEA', '#764BA2'],
    'Shopping': ['#F093FB', '#F5576C'],
    'Security': ['#FA709A', '#FEE140'],
    'Marketing': ['#4FACFE', '#00F2FE'],
    'Other': ['#667EEA', '#764BA2'],
  };

  if (isLoading || weatherLoading) {
    return (
      <View style={styles.container}>
        <EnhancedLoadingSkeleton 
          variant="automation" 
          count={1} 
          showAnimation={true}
          height={260}
        />
      </View>
    );
  }

  // Use the actual featured automation data if available
  const automationData = featured ? {
    id: featured.id,
    title: featured.title,
    description: featured.description,
    category: featured.category,
    user: featured.user || { name: featured.author || 'Community' },
    likesCount: featured.likesCount || 0,
    downloadsCount: featured.downloadsCount || featured.uses || 0,
    rating: featured.rating,
    isTrending: featured.isTrending || false
  } : {
    // Fallback only when no featured automation is available
    id: 'fallback-1',
    title: 'Loading Featured Automation...',
    description: 'Discovering the perfect automation for you',
    category: 'Productivity',
    user: { name: 'ZapTap' },
    likesCount: 0,
    downloadsCount: 0,
    isTrending: false
  };

  const gradient = categoryColors[automationData.category] || ['#6366F1', '#818CF8'];
  
  // Make gradient more transparent when weather effects are active
  const overlayGradient = weather ? [
    weather.condition === 'clear' && !weather.isDay 
      ? `${gradient[0]}22` // Very transparent for stars (13% opacity)
      : weather.condition === 'clear'
      ? `${gradient[0]}55` // Semi-transparent for day clear (33% opacity)
      : weather.condition === 'rain' || weather.condition === 'thunderstorm'
      ? `${gradient[0]}66` // More transparent for rain (40% opacity)
      : `${gradient[0]}77`, // Less transparent for other conditions (47% opacity)
    weather.condition === 'clear' && !weather.isDay
      ? `${gradient[1]}11` // Very transparent for stars (7% opacity)
      : weather.condition === 'clear'
      ? `${gradient[1]}44` // Semi-transparent for day clear (27% opacity)
      : weather.condition === 'rain' || weather.condition === 'thunderstorm'
      ? `${gradient[1]}55` // More transparent for rain (33% opacity)
      : `${gradient[1]}66`, // Less transparent for other conditions (40% opacity)
  ] : gradient;

  const handlePress = () => {
    const isRealAutomation = featured && 
                            featured.id && 
                            featured.id.length === 36 &&
                            !featured.id.startsWith('550e8400-e29b-41d4-a716');
    
    console.log('[FeaturedWidget] Card clicked:', {
      id: featured?.id,
      title: featured?.title,
      isRealAutomation,
      isSample: featured?.id?.startsWith('550e8400-e29b-41d4-a716')
    });
    
    if (isRealAutomation) {
      console.log('[FeaturedWidget] Navigating to real automation:', featured.id);
      navigation.navigate('AutomationDetails' as never, { automationId: featured.id } as never);
    } else {
      // Navigate to template builder with the featured automation as a template
      console.log('[FeaturedWidget] Sample automation - navigating to template builder');
      navigation.navigate('ModernAutomationBuilder' as never, {
        template: {
          id: featured?.id,
          title: featured?.title,
          description: featured?.description,
          category: featured?.category,
          steps: [
            { type: 'trigger', name: 'Manual Trigger', config: {} },
            { type: 'action', name: 'Sample Action', config: {} }
          ]
        },
        mode: 'template'
      } as never);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: pulseAnim }],
            opacity: fadeAnim
          }
        ]}>
        
        {/* Weather effects layer - render first so it's in the background */}
        <View style={styles.weatherLayer}>
          <WeatherEffects
            condition={weather?.condition || 'clear'}
            isDay={weather?.isDay ?? true}
            intensity={weather?.rainIntensity || weather?.snowIntensity || 0.5}
          />
        </View>
        
        {/* Semi-transparent gradient overlay - only if we have weather or need fallback */}
        {(weather || !featured) && (
          <LinearGradient
            colors={overlayGradient}
            style={[styles.gradientBackground, { opacity: weather ? 0.8 : 1 }]}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Blur overlay for rain/snow */}
        {weather && (weather.condition === 'rain' || weather.condition === 'drizzle' || weather.condition === 'snow') && (
          <BlurView
            intensity={weather.condition === 'snow' ? 15 : 10}
            tint={weather.isDay ? 'light' : 'dark'}
            style={styles.blurLayer}
          />
        )}
        
        {/* Content layer */}
        <TouchableOpacity
          style={styles.contentContainer}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          {/* Weather info bar */}
          {weather && (
            <View style={styles.weatherBar}>
              <View style={styles.weatherInfo}>
                <Text style={styles.weatherEmoji}>
                  {WeatherService.getWeatherEmoji(weather.condition, weather.isDay)}
                </Text>
                <Text style={styles.weatherText}>
                  {weather.temperature}° • {weather.description}
                </Text>
              </View>
              <View style={styles.weatherStats}>
                <MaterialCommunityIcons name="water-percent" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherStatText}>{weather.humidity}%</Text>
                <MaterialCommunityIcons name="weather-windy" size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
                <Text style={styles.weatherStatText}>{weather.windSpeed} km/h</Text>
              </View>
            </View>
          )}

          {/* Header badges */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="star" size={14} color={gradient[0]} />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
            {automationData.isTrending && (
              <View style={styles.trendingBadge}>
                <MaterialCommunityIcons name="trending-up" size={14} color="#FFFFFF" />
                <Text style={styles.trendingText}>Trending</Text>
              </View>
            )}
          </View>

          {/* Main content */}
          <View style={styles.mainContent}>
            <Text style={styles.title} numberOfLines={2}>
              {automationData.title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {automationData.description}
            </Text>

            {/* Stats and action button */}
            <View style={styles.footer}>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <MaterialCommunityIcons name="heart" size={14} color="#FFFFFF" />
                  <Text style={styles.statText}>{automationData.likesCount}</Text>
                </View>
                <View style={styles.stat}>
                  <MaterialCommunityIcons name="download" size={14} color="#FFFFFF" />
                  <Text style={styles.statText}>{automationData.downloadsCount}</Text>
                </View>
                {automationData.rating && (
                  <View style={styles.stat}>
                    <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                    <Text style={styles.statText}>{automationData.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity style={styles.tryButton} onPress={handlePress}>
                <Text style={styles.tryButtonText}>Try it</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Author info */}
          <View style={styles.authorBar}>
            <MaterialCommunityIcons name="account-circle" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.authorText}>by {automationData.user.name}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  cardContainer: {
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    // Remove background color to allow weather effects to show
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2, // Above weather but below content
  },
  weatherLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Behind gradient
    backgroundColor: '#0a0a0a', // Dark background for weather to show against
    pointerEvents: 'none',
  },
  blurLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    zIndex: 3, // Above gradient
    pointerEvents: 'none',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 4, // Above everything else
  },
  weatherBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  weatherText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  weatherStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 2,
    marginRight: 6,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,100,100,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingText: {
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tryButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
  },
  authorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  authorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 6,
  },
});

export default FeaturedAutomationWeatherWidget;