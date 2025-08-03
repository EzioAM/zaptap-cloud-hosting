import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Button,
  Searchbar,
  Chip,
  IconButton,
  DataTable,
  Menu,
  ActivityIndicator,
} from 'react-native-paper';
import { DeveloperService } from '../../services/developer/DeveloperService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem {
  key: string;
  value: string;
  size: number;
  type: string;
}

export const StorageInspector: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<{
    items: StorageItem[];
    totalSize: number;
    itemCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [sortBy, setSortBy] = useState<'key' | 'size'>('key');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    setLoading(true);
    try {
      const info = await DeveloperService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      Alert.alert('Error', 'Failed to load storage info');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStorageInfo();
    setRefreshing(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteItem = (key: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${key}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(key);
              await loadStorageInfo();
              setSelectedItem(null);
              Alert.alert('Success', 'Item deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleEditItem = (item: StorageItem) => {
    Alert.prompt(
      'Edit Value',
      `Edit value for "${item.key}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            if (value !== undefined) {
              try {
                await AsyncStorage.setItem(item.key, value);
                await loadStorageInfo();
                Alert.alert('Success', 'Item updated');
              } catch (error) {
                Alert.alert('Error', 'Failed to update item');
              }
            }
          },
        },
      ],
      'plain-text',
      item.value
    );
  };

  const clearAllStorage = () => {
    Alert.alert(
      'Clear All Storage',
      'This will delete ALL stored data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await DeveloperService.clearStorage();
              await loadStorageInfo();
              Alert.alert('Success', 'All storage cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage');
            }
          },
        },
      ]
    );
  };

  const exportStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const exportData = {
        exportedAt: new Date().toISOString(),
        itemCount: items.length,
        data: Object.fromEntries(items.filter(([k, v]) => k && v)),
      };
      
      console.log('STORAGE_EXPORT:', exportData);
      Alert.alert('Success', 'Storage data exported to console logs');
    } catch (error) {
      Alert.alert('Error', 'Failed to export storage');
    }
  };

  const importStorage = () => {
    Alert.alert(
      'Import Storage',
      'To import storage data:\n\n1. Export data from another device\n2. Copy the JSON from console\n3. Use AsyncStorage.multiSet() in debug console',
      [{ text: 'OK' }]
    );
  };

  const getFilteredItems = (): StorageItem[] => {
    if (!storageInfo) return [];
    
    let filtered = storageInfo.items.filter(item =>
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort items
    filtered.sort((a, b) => {
      if (sortBy === 'key') {
        return a.key.localeCompare(b.key);
      } else {
        return b.size - a.size;
      }
    });

    return filtered;
  };

  const renderItemDetails = () => {
    if (!selectedItem) return null;

    let parsedValue: any;
    let isParsed = false;

    try {
      parsedValue = JSON.parse(selectedItem.value);
      isParsed = true;
    } catch (e) {
      parsedValue = selectedItem.value;
    }

    return (
      <Card style={styles.detailsCard}>
        <Card.Title 
          title="Item Details"
          right={() => (
            <IconButton
              icon="close"
              onPress={() => setSelectedItem(null)}
            />
          )}
        />
        <Card.Content>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Key</Text>
            <Text style={styles.detailValue} selectable>{selectedItem.key}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Type</Text>
            <Chip mode="outlined" compact>{selectedItem.type}</Chip>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{formatSize(selectedItem.size)}</Text>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Value</Text>
              <IconButton
                icon="content-copy"
                size={16}
                onPress={() => {
                  console.log(`STORAGE_ITEM_${selectedItem.key}:`, selectedItem.value);
                  Alert.alert('Copied', 'Value copied to console');
                }}
              />
            </View>
            <ScrollView style={styles.valueScroll}>
              <Text style={styles.valueText} selectable>
                {isParsed ? JSON.stringify(parsedValue, null, 2) : parsedValue}
              </Text>
            </ScrollView>
          </View>

          <View style={styles.detailActions}>
            <Button
              mode="text"
              onPress={() => handleEditItem(selectedItem)}
            >
              Edit
            </Button>
            <Button
              mode="text"
              textColor="#f44336"
              onPress={() => handleDeleteItem(selectedItem.key)}
            >
              Delete
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !storageInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading storage info...</Text>
      </View>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <View style={styles.container}>
      {/* Storage Overview */}
      <Card style={styles.overviewCard}>
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storageInfo?.itemCount || 0}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatSize(storageInfo?.totalSize || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Size</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Controls */}
      <Card style={styles.controlsCard}>
        <Card.Content>
          <Searchbar
            placeholder="Search keys or values..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          <View style={styles.controls}>
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setSortMenuVisible(true)}
                  icon="sort"
                >
                  Sort by {sortBy === 'key' ? 'Name' : 'Size'}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setSortBy('key');
                  setSortMenuVisible(false);
                }}
                title="Sort by Name"
                leadingIcon={sortBy === 'key' ? 'radiobox-marked' : 'radiobox-blank'}
              />
              <Menu.Item
                onPress={() => {
                  setSortBy('size');
                  setSortMenuVisible(false);
                }}
                title="Sort by Size"
                leadingIcon={sortBy === 'size' ? 'radiobox-marked' : 'radiobox-blank'}
              />
            </Menu>

            <View style={styles.actionButtons}>
              <IconButton
                icon="export"
                onPress={exportStorage}
              />
              <IconButton
                icon="import"
                onPress={importStorage}
              />
              <IconButton
                icon="delete"
                onPress={clearAllStorage}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Storage Items */}
      <ScrollView
        style={styles.itemsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No items match your search' : 'No items in storage'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Key</DataTable.Title>
              <DataTable.Title numeric>Size</DataTable.Title>
              <DataTable.Title>Type</DataTable.Title>
            </DataTable.Header>

            {filteredItems.map((item) => (
              <DataTable.Row
                key={item.key}
                onPress={() => setSelectedItem(item)}
              >
                <DataTable.Cell>{item.key}</DataTable.Cell>
                <DataTable.Cell numeric>{formatSize(item.size)}</DataTable.Cell>
                <DataTable.Cell>
                  <Chip mode="flat" compact textStyle={styles.typeChip}>
                    {item.type}
                  </Chip>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </ScrollView>

      {/* Item Details */}
      {selectedItem && renderItemDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  overviewCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  controlsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  itemsContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  typeChip: {
    fontSize: 10,
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    elevation: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  valueScroll: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  valueText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});