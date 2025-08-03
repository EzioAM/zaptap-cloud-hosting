import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  SegmentedButtons,
  IconButton,
  Chip,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationTrigger, LocationTriggerConfig as LocationConfig } from '../../types';
import { locationTriggerService } from '../../services/triggers/LocationTriggerService';
import * as Location from 'expo-location';

interface LocationTriggerConfigProps {
  trigger?: AutomationTrigger;
  onSave: (trigger: AutomationTrigger) => void;
  onCancel: () => void;
  visible: boolean;
  initialTriggerType?: 'location_enter' | 'location_exit';
}

const LocationTriggerConfig: React.FC<LocationTriggerConfigProps> = ({
  trigger,
  onSave,
  onCancel,
  visible,
  initialTriggerType = 'location_enter'
}) => {
  const [triggerType, setTriggerType] = useState<'location_enter' | 'location_exit'>('location_enter');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  console.log('LocationTriggerConfig render - visible:', visible, 'initialTriggerType:', initialTriggerType);

  useEffect(() => {
    console.log('LocationTriggerConfig useEffect - trigger:', trigger, 'visible:', visible, 'initialTriggerType:', initialTriggerType);
    if (visible) {
      if (trigger && trigger.config) {
        const config = trigger.config as LocationConfig;
        setTriggerType(trigger.type as 'location_enter' | 'location_exit');
        setLocationName(config.name || '');
        setAddress(config.address || '');
        setLatitude(config.latitude?.toString() || '');
        setLongitude(config.longitude?.toString() || '');
        setRadius(config.radius?.toString() || '100');
      } else {
        // Reset form for new trigger
        setTriggerType(initialTriggerType);
        setLocationName('');
        setAddress('');
        setLatitude('');
        setLongitude('');
        setRadius('100');
      }
    }
  }, [trigger, visible, initialTriggerType]);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await locationTriggerService.getCurrentLocation();
      if (location) {
        setLatitude(location.coords.latitude.toString());
        setLongitude(location.coords.longitude.toString());
        
        // Try to reverse geocode to get address
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          if (addresses.length > 0) {
            const addr = addresses[0];
            const fullAddress = [
              addr.streetNumber,
              addr.street,
              addr.city,
              addr.region,
              addr.postalCode
            ].filter(Boolean).join(', ');
            
            setAddress(fullAddress);
            
            if (!locationName) {
              setLocationName(addr.name || addr.street || 'Current Location');
            }
          }
        } catch (geocodeError) {
          console.log('Geocoding failed, but location obtained');
        }
        
        Alert.alert('Success', 'Current location obtained successfully!');
      } else {
        Alert.alert('Error', 'Failed to get current location. Please check location permissions.');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to get location: ${error.message}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateAndSave = () => {
    console.log('Validating and saving trigger with type:', triggerType);
    
    if (!locationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please provide latitude and longitude coordinates');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Error', 'Latitude must be a number between -90 and 90');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Error', 'Longitude must be a number between -180 and 180');
      return;
    }

    if (isNaN(rad) || rad < 10 || rad > 10000) {
      Alert.alert('Error', 'Radius must be a number between 10 and 10000 meters');
      return;
    }

    const newTrigger: AutomationTrigger = {
      id: trigger?.id || `trigger_${Date.now()}`,
      type: triggerType,
      enabled: true,
      config: {
        latitude: lat,
        longitude: lng,
        radius: rad,
        name: locationName.trim(),
        address: address.trim(),
      } as LocationConfig
    };

    console.log('Created trigger:', newTrigger);
    onSave(newTrigger);
  };

  const getRadiusDescription = () => {
    const rad = parseInt(radius);
    if (rad < 50) return 'Very precise (good for indoor locations)';
    if (rad < 200) return 'Moderate precision (good for buildings)';
    if (rad < 500) return 'Low precision (good for neighborhoods)';
    return 'Very low precision (good for large areas)';
  };

  console.log('LocationTriggerConfig rendering modal - visible:', visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        console.log('Modal onRequestClose called, visible was:', visible);
        onCancel();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Location Trigger</Text>
            <IconButton icon="close" onPress={onCancel} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Trigger Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trigger Event</Text>
              <SegmentedButtons
                value={triggerType}
                onValueChange={(value) => setTriggerType(value as 'location_enter' | 'location_exit')}
                buttons={[
                  {
                    value: 'location_enter',
                    label: 'Arrive',
                    icon: 'login',
                  },
                  {
                    value: 'location_exit',
                    label: 'Leave',
                    icon: 'logout',
                  },
                ]}
                style={styles.segmentedButtons}
              />
              <Text style={styles.description}>
                {triggerType === 'location_enter' 
                  ? 'Trigger when you arrive at this location'
                  : 'Trigger when you leave this location'
                }
              </Text>
            </View>

            {/* Location Name */}
            <View style={styles.section}>
              <TextInput
                label="Location Name"
                value={locationName}
                onChangeText={setLocationName}
                placeholder="e.g., Home, Office, Gym"
                style={styles.input}
              />
            </View>

            {/* Address */}
            <View style={styles.section}>
              <TextInput
                label="Address (Optional)"
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St, City, State"
                multiline
                style={styles.input}
              />
            </View>

            {/* Location Coordinates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location Coordinates</Text>
              <View style={styles.coordinatesContainer}>
                <TextInput
                  label="Latitude"
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="37.7749"
                  keyboardType="numeric"
                  style={[styles.input, styles.coordinateInput]}
                />
                <TextInput
                  label="Longitude"
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="-122.4194"
                  keyboardType="numeric"
                  style={[styles.input, styles.coordinateInput]}
                />
              </View>
              
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
                loading={isGettingLocation}
                disabled={isGettingLocation}
                icon="crosshairs-gps"
                style={styles.locationButton}
              >
                Use Current Location
              </Button>
            </View>

            {/* Radius */}
            <View style={styles.section}>
              <TextInput
                label="Trigger Radius (meters)"
                value={radius}
                onChangeText={setRadius}
                placeholder="100"
                keyboardType="numeric"
                style={styles.input}
              />
              <View style={styles.radiusInfo}>
                <Chip icon="information" mode="outlined" compact>
                  {getRadiusDescription()}
                </Chip>
              </View>
            </View>

            {/* Location Preview */}
            {latitude && longitude && (
              <Surface style={styles.previewCard} elevation={1}>
                <View style={styles.previewHeader}>
                  <Icon name="map-marker" size={20} color="#6200ee" />
                  <Text style={styles.previewTitle}>Location Preview</Text>
                </View>
                <Text style={styles.previewText}>
                  📍 {locationName || 'Unnamed Location'}
                </Text>
                {address && (
                  <Text style={styles.previewAddress}>{address}</Text>
                )}
                <Text style={styles.previewCoords}>
                  {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
                </Text>
                <Text style={styles.previewRadius}>
                  Radius: {radius}m
                </Text>
              </Surface>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button onPress={onCancel} style={styles.cancelButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={validateAndSave}
              style={styles.saveButton}
            >
              Save Trigger
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  segmentedButtons: {
    marginVertical: 8,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  locationButton: {
    marginTop: 8,
  },
  radiusInfo: {
    marginTop: 8,
  },
  previewCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  previewAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  previewRadius: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default LocationTriggerConfig;