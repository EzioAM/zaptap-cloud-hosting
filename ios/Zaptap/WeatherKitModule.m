#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WeatherKitModule, NSObject)

RCT_EXTERN_METHOD(setAuthToken:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchCurrentWeather:(nonnull NSNumber *)latitude
                  longitude:(nonnull NSNumber *)longitude
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchHourlyForecast:(nonnull NSNumber *)latitude
                  longitude:(nonnull NSNumber *)longitude
                  hours:(nonnull NSNumber *)hours
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchDailyForecast:(nonnull NSNumber *)latitude
                  longitude:(nonnull NSNumber *)longitude
                  days:(nonnull NSNumber *)days
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end