//
//  HomeKitBridge.swift
//  ZapTap
//
//  Native bridge for HomeKit integration
//

import Foundation
import HomeKit

@objc(HomeKitBridge)
@objcMembers
class HomeKitBridge: NSObject {
  
  // MARK: - Properties
  private let homeManager = HMHomeManager()
  private var homes: [HMHome] = []
  private var accessories: [HMAccessory] = []
  private let queue = DispatchQueue(label: "com.zaptap.homekit", qos: .userInitiated)
  
  // MARK: - Initialization
  override init() {
    super.init()
    homeManager.delegate = self
  }
  
  // MARK: - React Native Bridge Methods
  
  @objc
  func initialize(_ resolver: @escaping RCTPromiseResolveBlock,
                 rejecter: @escaping RCTPromiseRejectBlock) {
    // Request HomeKit permissions
    if #available(iOS 13.0, *) {
      homeManager.delegate = self
      
      // Wait for homes to load
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
        self?.homes = self?.homeManager.homes ?? []
        resolver(["status": "initialized", "homeCount": self?.homes.count ?? 0])
      }
    } else {
      rejecter("HOMEKIT_ERROR", "HomeKit requires iOS 13.0 or later", nil)
    }
  }
  
  @objc
  func discover(_ resolver: @escaping RCTPromiseResolveBlock,
               rejecter: @escaping RCTPromiseRejectBlock) {
    queue.async { [weak self] in
      var discoveredDevices: [[String: Any]] = []
      
      // Iterate through all homes and accessories
      for home in self?.homes ?? [] {
        for accessory in home.accessories {
          let device: [String: Any] = [
            "uniqueId": accessory.uniqueIdentifier.uuidString,
            "name": accessory.name,
            "manufacturer": accessory.manufacturer ?? "Unknown",
            "model": accessory.model ?? "Unknown",
            "firmwareRevision": accessory.firmwareVersion ?? "Unknown",
            "category": self?.mapCategory(accessory.category.categoryType) ?? "Unknown",
            "reachable": accessory.isReachable,
            "blocked": accessory.isBlocked,
            "bridged": accessory.isBridged,
            "room": accessory.room?.name ?? "No Room",
            "services": self?.mapServices(accessory.services) ?? []
          ]
          discoveredDevices.append(device)
        }
      }
      
      resolver(discoveredDevices)
    }
  }
  
  @objc
  func setCharacteristic(_ accessoryId: String,
                        command: NSDictionary,
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
    queue.async { [weak self] in
      // Find the accessory
      var targetAccessory: HMAccessory?
      for home in self?.homes ?? [] {
        if let accessory = home.accessories.first(where: { $0.uniqueIdentifier.uuidString == accessoryId }) {
          targetAccessory = accessory
          break
        }
      }
      
      guard let accessory = targetAccessory else {
        rejecter("ACCESSORY_NOT_FOUND", "Accessory not found", nil)
        return
      }
      
      guard let action = command["action"] as? String,
            let parameters = command["parameters"] as? [String: Any] else {
        rejecter("INVALID_COMMAND", "Invalid command format", nil)
        return
      }
      
      // Find the appropriate service and characteristic
      switch action {
      case "on", "off":
        self?.setPowerState(accessory: accessory, on: action == "on") { error in
          if let error = error {
            rejecter("COMMAND_ERROR", "Failed to set power state", error)
          } else {
            resolver(["status": "success"])
          }
        }
        
      case "setLevel":
        if let level = parameters["level"] as? Int {
          self?.setBrightness(accessory: accessory, brightness: level) { error in
            if let error = error {
              rejecter("COMMAND_ERROR", "Failed to set brightness", error)
            } else {
              resolver(["status": "success"])
            }
          }
        }
        
      case "setColor":
        if let hue = parameters["hue"] as? Float,
           let saturation = parameters["saturation"] as? Float {
          self?.setColor(accessory: accessory, hue: hue, saturation: saturation) { error in
            if let error = error {
              rejecter("COMMAND_ERROR", "Failed to set color", error)
            } else {
              resolver(["status": "success"])
            }
          }
        }
        
      case "setTemperature":
        if let temperature = parameters["temperature"] as? Float {
          self?.setTemperature(accessory: accessory, temperature: temperature) { error in
            if let error = error {
              rejecter("COMMAND_ERROR", "Failed to set temperature", error)
            } else {
              resolver(["status": "success"])
            }
          }
        }
        
      case "lock", "unlock":
        self?.setLockState(accessory: accessory, locked: action == "lock") { error in
          if let error = error {
            rejecter("COMMAND_ERROR", "Failed to set lock state", error)
          } else {
            resolver(["status": "success"])
          }
        }
        
      default:
        rejecter("UNSUPPORTED_COMMAND", "Command not supported", nil)
      }
    }
  }
  
  @objc
  func addAccessory(_ name: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    guard let home = homes.first else {
      rejecter("NO_HOME", "No HomeKit home found", nil)
      return
    }
    
    home.addAndSetupAccessories { error in
      if let error = error {
        rejecter("ADD_ERROR", "Failed to add accessory", error)
      } else {
        resolver(["status": "success"])
      }
    }
  }
  
  // MARK: - Private Helper Methods
  
  private func mapCategory(_ category: String) -> String {
    switch category {
    case HMAccessoryCategoryTypeLightbulb:
      return "light"
    case HMAccessoryCategoryTypeSwitch:
      return "switch"
    case HMAccessoryCategoryTypeThermostat:
      return "thermostat"
    case HMAccessoryCategoryTypeDoorLock:
      return "lock"
    case HMAccessoryCategoryTypeSensor:
      return "sensor"
    case HMAccessoryCategoryTypeOutlet:
      return "outlet"
    case HMAccessoryCategoryTypeFan:
      return "fan"
    case HMAccessoryCategoryTypeSecuritySystem:
      return "security"
    case HMAccessoryCategoryTypeCamera:
      return "camera"
    case HMAccessoryCategoryTypeDoorbell:
      return "doorbell"
    default:
      return "other"
    }
  }
  
  private func mapServices(_ services: [HMService]) -> [[String: Any]] {
    return services.map { service in
      return [
        "type": service.serviceType,
        "name": service.name ?? "Unknown Service",
        "primary": service.isPrimaryService,
        "characteristics": service.characteristics.map { char in
          return [
            "type": char.characteristicType,
            "readable": char.properties.contains(HMCharacteristicPropertyReadable),
            "writable": char.properties.contains(HMCharacteristicPropertyWritable),
            "value": char.value ?? NSNull()
          ]
        }
      ]
    }
  }
  
  private func setPowerState(accessory: HMAccessory, on: Bool, completion: @escaping (Error?) -> Void) {
    // Find power characteristic
    for service in accessory.services {
      if let characteristic = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypePowerState
      }) {
        characteristic.writeValue(on) { error in
          completion(error)
        }
        return
      }
    }
    completion(NSError(domain: "HomeKitBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "Power characteristic not found"]))
  }
  
  private func setBrightness(accessory: HMAccessory, brightness: Int, completion: @escaping (Error?) -> Void) {
    for service in accessory.services {
      if let characteristic = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypeBrightness
      }) {
        characteristic.writeValue(brightness) { error in
          completion(error)
        }
        return
      }
    }
    completion(NSError(domain: "HomeKitBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "Brightness characteristic not found"]))
  }
  
  private func setColor(accessory: HMAccessory, hue: Float, saturation: Float, completion: @escaping (Error?) -> Void) {
    var hueSet = false
    var satSet = false
    var errors: [Error] = []
    
    let group = DispatchGroup()
    
    for service in accessory.services {
      // Set hue
      if let hueChar = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypeHue
      }) {
        group.enter()
        hueChar.writeValue(hue) { error in
          if let error = error {
            errors.append(error)
          } else {
            hueSet = true
          }
          group.leave()
        }
      }
      
      // Set saturation
      if let satChar = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypeSaturation
      }) {
        group.enter()
        satChar.writeValue(saturation) { error in
          if let error = error {
            errors.append(error)
          } else {
            satSet = true
          }
          group.leave()
        }
      }
    }
    
    group.notify(queue: .main) {
      if hueSet && satSet {
        completion(nil)
      } else if !errors.isEmpty {
        completion(errors.first)
      } else {
        completion(NSError(domain: "HomeKitBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "Color characteristics not found"]))
      }
    }
  }
  
  private func setTemperature(accessory: HMAccessory, temperature: Float, completion: @escaping (Error?) -> Void) {
    for service in accessory.services {
      if let characteristic = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypeTargetTemperature
      }) {
        characteristic.writeValue(temperature) { error in
          completion(error)
        }
        return
      }
    }
    completion(NSError(domain: "HomeKitBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "Temperature characteristic not found"]))
  }
  
  private func setLockState(accessory: HMAccessory, locked: Bool, completion: @escaping (Error?) -> Void) {
    for service in accessory.services {
      if let characteristic = service.characteristics.first(where: { 
        $0.characteristicType == HMCharacteristicTypeTargetLockManagementAutoSecurityTimeout
      }) {
        let state = locked ? HMCharacteristicValueLockManagementAutoSecurityTimeout.secured : HMCharacteristicValueLockManagementAutoSecurityTimeout.unsecured
        characteristic.writeValue(state) { error in
          completion(error)
        }
        return
      }
    }
    completion(NSError(domain: "HomeKitBridge", code: 1, userInfo: [NSLocalizedDescriptionKey: "Lock characteristic not found"]))
  }
  
  // MARK: - React Native Module Setup
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  static func moduleName() -> String {
    return "HomeKitBridge"
  }
}

// MARK: - HMHomeManagerDelegate
extension HomeKitBridge: HMHomeManagerDelegate {
  func homeManagerDidUpdateHomes(_ manager: HMHomeManager) {
    homes = manager.homes
  }
  
  func homeManager(_ manager: HMHomeManager, didAdd home: HMHome) {
    homes = manager.homes
  }
  
  func homeManager(_ manager: HMHomeManager, didRemove home: HMHome) {
    homes = manager.homes
  }
}