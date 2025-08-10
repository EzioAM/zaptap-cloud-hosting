import Foundation
import WeatherKit
import CoreLocation

@available(iOS 16.0, *)
@objc(WeatherKitModule)
class WeatherKitModule: NSObject {
  private let weatherService = WeatherService.shared
  private var authToken: String?
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // Set authentication token for WeatherKit
  @objc
  func setAuthToken(_ token: String, 
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    self.authToken = token
    resolve(true)
  }
  
  // Check if WeatherKit is available
  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      // Check if device supports WeatherKit and app has proper entitlements
      Task {
        do {
          // Try to fetch weather for a test location to verify entitlements
          let testLocation = CLLocation(latitude: 37.3230, longitude: -122.0322)
          let _ = try await weatherService.weather(for: testLocation)
          resolve(true)
        } catch {
          // If error is about entitlements or availability, return false
          if error.localizedDescription.contains("entitlement") || 
             error.localizedDescription.contains("not available") {
            resolve(false)
          } else {
            // For other errors (like network), still consider it available
            resolve(true)
          }
        }
      }
    } else {
      resolve(false)
    }
  }
  
  // Fetch current weather
  @objc
  func fetchCurrentWeather(_ latitude: NSNumber, 
                          longitude: NSNumber,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else {
      reject("WEATHERKIT_UNAVAILABLE", "WeatherKit requires iOS 16.0 or later", nil)
      return
    }
    
    // For now, if we have a JWT token, we would need to use URLSession to call WeatherKit REST API
    // Since the native WeatherKit framework doesn't directly accept JWT tokens,
    // we need to use the REST API instead
    if let token = self.authToken {
      // Use REST API with JWT token
      fetchWeatherViaAPI(latitude: latitude.doubleValue, 
                        longitude: longitude.doubleValue, 
                        token: token,
                        resolver: resolve,
                        rejecter: reject)
      return
    }
    
    // Fallback to native WeatherKit (requires proper entitlements)
    let location = CLLocation(latitude: latitude.doubleValue, longitude: longitude.doubleValue)
    
    Task {
      do {
        let weather = try await weatherService.weather(for: location)
        
        // Get current weather
        let current = weather.currentWeather
        
        // Convert to dictionary for React Native
        let weatherData: [String: Any] = [
          "temperature": current.temperature.value, // in Celsius
          "apparentTemperature": current.apparentTemperature.value,
          "humidity": current.humidity,
          "pressure": current.pressure.value,
          "windSpeed": current.wind.speed.converted(to: .kilometersPerHour).value,
          "windDirection": current.wind.direction.value,
          "cloudCover": current.cloudCover,
          "uvIndex": current.uvIndex.value,
          "visibility": current.visibility.value,
          "conditionCode": current.condition.rawValue,
          "isDaylight": current.isDaylight,
          "precipitationIntensity": current.precipitationIntensity.value
        ]
        
        resolve(weatherData)
      } catch {
        reject("WEATHERKIT_ERROR", "Failed to fetch weather: \(error.localizedDescription)", error)
      }
    }
  }
  
  // Fetch hourly forecast
  @objc
  func fetchHourlyForecast(_ latitude: NSNumber,
                          longitude: NSNumber,
                          hours: NSNumber,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else {
      reject("WEATHERKIT_UNAVAILABLE", "WeatherKit requires iOS 16.0 or later", nil)
      return
    }
    
    let location = CLLocation(latitude: latitude.doubleValue, longitude: longitude.doubleValue)
    
    Task {
      do {
        let weather = try await weatherService.weather(for: location)
        
        // Get hourly forecast
        let hourlyForecast = weather.hourlyForecast.forecast.prefix(hours.intValue)
        
        let forecast = hourlyForecast.map { hour in
          return [
            "date": hour.date.timeIntervalSince1970,
            "temperature": hour.temperature.value,
            "apparentTemperature": hour.apparentTemperature.value,
            "humidity": hour.humidity,
            "precipitationChance": hour.precipitationChance,
            "precipitationAmount": hour.precipitationAmount.value,
            "windSpeed": hour.wind.speed.converted(to: .kilometersPerHour).value,
            "cloudCover": hour.cloudCover,
            "conditionCode": hour.condition.rawValue,
            "isDaylight": hour.isDaylight
          ]
        }
        
        resolve(Array(forecast))
      } catch {
        reject("WEATHERKIT_ERROR", "Failed to fetch hourly forecast: \(error.localizedDescription)", error)
      }
    }
  }
  
  // Fetch daily forecast
  @objc
  func fetchDailyForecast(_ latitude: NSNumber,
                         longitude: NSNumber,
                         days: NSNumber,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.0, *) else {
      reject("WEATHERKIT_UNAVAILABLE", "WeatherKit requires iOS 16.0 or later", nil)
      return
    }
    
    let location = CLLocation(latitude: latitude.doubleValue, longitude: longitude.doubleValue)
    
    Task {
      do {
        let weather = try await weatherService.weather(for: location)
        
        // Get daily forecast
        let dailyForecast = weather.dailyForecast.forecast.prefix(days.intValue)
        
        let forecast = dailyForecast.map { day in
          return [
            "date": day.date.timeIntervalSince1970,
            "lowTemperature": day.lowTemperature.value,
            "highTemperature": day.highTemperature.value,
            "precipitationChance": day.precipitationChance,
            "precipitationAmount": day.precipitationAmount.value,
            "conditionCode": day.condition.rawValue,
            "uvIndex": day.uvIndex.value,
            "sunrise": day.sun.sunrise?.timeIntervalSince1970 ?? 0,
            "sunset": day.sun.sunset?.timeIntervalSince1970 ?? 0
          ]
        }
        
        resolve(Array(forecast))
      } catch {
        reject("WEATHERKIT_ERROR", "Failed to fetch daily forecast: \(error.localizedDescription)", error)
      }
    }
  }
  
  // Fetch weather using REST API with JWT token
  private func fetchWeatherViaAPI(latitude: Double,
                                  longitude: Double,
                                  token: String,
                                  resolver resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    let urlString = "https://weatherkit.apple.com/api/v1/weather/en_US/\(latitude)/\(longitude)?dataSets=currentWeather"
    
    guard let url = URL(string: urlString) else {
      reject("WEATHERKIT_ERROR", "Invalid URL", nil)
      return
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        reject("WEATHERKIT_ERROR", "Network error: \(error.localizedDescription)", error)
        return
      }
      
      guard let httpResponse = response as? HTTPURLResponse else {
        reject("WEATHERKIT_ERROR", "Invalid response", nil)
        return
      }
      
      if httpResponse.statusCode != 200 {
        reject("WEATHERKIT_ERROR", "HTTP error: \(httpResponse.statusCode)", nil)
        return
      }
      
      guard let data = data else {
        reject("WEATHERKIT_ERROR", "No data received", nil)
        return
      }
      
      do {
        if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
           let currentWeather = json["currentWeather"] as? [String: Any] {
          
          // Convert API response to our format
          let weatherData: [String: Any] = [
            "temperature": currentWeather["temperature"] ?? 0,
            "apparentTemperature": currentWeather["temperatureApparent"] ?? 0,
            "humidity": (currentWeather["humidity"] as? Double ?? 0) * 100, // Convert to percentage
            "pressure": currentWeather["pressure"] ?? 0,
            "windSpeed": currentWeather["windSpeed"] ?? 0,
            "windDirection": currentWeather["windDirection"] ?? 0,
            "cloudCover": (currentWeather["cloudCover"] as? Double ?? 0) * 100,
            "uvIndex": currentWeather["uvIndex"] ?? 0,
            "visibility": currentWeather["visibility"] ?? 0,
            "conditionCode": currentWeather["conditionCode"] ?? "Clear",
            "isDaylight": currentWeather["daylight"] ?? true,
            "precipitationIntensity": currentWeather["precipitationIntensity"] ?? 0
          ]
          
          resolve(weatherData)
        } else {
          reject("WEATHERKIT_ERROR", "Invalid response format", nil)
        }
      } catch {
        reject("WEATHERKIT_ERROR", "Failed to parse response: \(error.localizedDescription)", error)
      }
    }
    
    task.resume()
  }
}