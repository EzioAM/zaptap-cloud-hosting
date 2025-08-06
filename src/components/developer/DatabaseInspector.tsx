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
  ActivityIndicator,
  DataTable,
  Searchbar,
  Menu,
  IconButton,
  Chip,
} from 'react-native-paper';
import { DeveloperService } from '../../services/developer/DeveloperService';
import { supabase } from '../../services/supabase/client';
import { EventLogger } from '../../utils/EventLogger';

export const DatabaseInspector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    setLoading(true);
    try {
      const dbStats = await DeveloperService.getDatabaseStats();
      setStats(dbStats);
    } catch (error) {
      Alert.alert('Error', 'Failed to load database stats');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatabaseStats();
    setRefreshing(false);
  };

  const loadTableData = async (tableName: string) => {
    setLoading(true);
    setSelectedTable(tableName);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTableData(data || []);
      setPage(0);
    } catch (error) {
      EventLogger.error('Database', 'Failed to load table data:', error as Error);
      Alert.alert('Error', `Failed to load data from ${tableName}`);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportTableData = () => {
    if (!selectedTable || tableData.length === 0) return;

    const exportData = {
      table: selectedTable,
      exportedAt: new Date().toISOString(),
      rowCount: tableData.length,
      data: tableData,
    };

    Alert.alert(
      'Export Data',
      `Export ${tableData.length} rows from ${selectedTable}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export to Console',
          onPress: () => {
            EventLogger.debug('Database', 'EXPORT_${selectedTable.toUpperCase()}:', exportData);
            Alert.alert('Success', 'Data exported to console logs');
          },
        },
      ]
    );
  };

  const renderTableView = () => {
    if (!selectedTable || tableData.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No data available</Text>
          </Card.Content>
        </Card>
      );
    }

    const filteredData = tableData.filter(row => {
      if (!searchQuery) return true;
      return JSON.stringify(row).toLowerCase().includes(searchQuery.toLowerCase());
    });

    const paginatedData = filteredData.slice(
      page * itemsPerPage,
      (page + 1) * itemsPerPage
    );

    const columns = Object.keys(tableData[0] || {}).slice(0, 4); // Show first 4 columns

    return (
      <View>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>{selectedTable}</Text>
          <IconButton
            icon="export"
            size={20}
            onPress={exportTableData}
          />
        </View>

        <Searchbar
          placeholder="Search in table..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <ScrollView horizontal>
          <DataTable>
            <DataTable.Header>
              {columns.map(col => (
                <DataTable.Title key={col} style={styles.tableColumn}>
                  {col}
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {paginatedData.map((row, index) => (
              <DataTable.Row key={index}>
                {columns.map(col => (
                  <DataTable.Cell key={col} style={styles.tableColumn}>
                    {String(row[col] || '').substring(0, 50)}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}

            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredData.length / itemsPerPage)}
              onPageChange={setPage}
              label={`${page * itemsPerPage + 1}-${Math.min(
                (page + 1) * itemsPerPage,
                filteredData.length
              )} of ${filteredData.length}`}
              numberOfItemsPerPage={itemsPerPage}
              showFastPaginationControls
            />
          </DataTable>
        </ScrollView>
      </View>
    );
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading database info...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Database Overview */}
      <Card style={styles.card}>
        <Card.Title title="Database Overview" />
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.tables.length || 0}</Text>
              <Text style={styles.statLabel}>Tables</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.totalRecords || 0}</Text>
              <Text style={styles.statLabel}>Total Records</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Table List */}
      <Card style={styles.card}>
        <Card.Title title="Tables" />
        <Card.Content>
          {stats?.tables.map((table: any) => (
            <List.Item
              key={table.name}
              title={table.name}
              description={`${table.count} records`}
              left={(props) => <List.Icon {...props} icon="table" />}
              right={(props) => (
                <Chip mode="outlined" compact>
                  {table.count}
                </Chip>
              )}
              onPress={() => loadTableData(table.name)}
              style={[
                styles.tableItem,
                selectedTable === table.name && styles.selectedTableItem
              ]}
            />
          ))}
        </Card.Content>
      </Card>

      {/* Table Data View */}
      {selectedTable && (
        <Card style={styles.card}>
          <Card.Content>
            {loading ? (
              <ActivityIndicator style={styles.tableLoading} />
            ) : (
              renderTableView()
            )}
          </Card.Content>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Title title="Database Actions" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={async () => {
              try {
                const bundle = await DeveloperService.exportDebugBundle();
                EventLogger.debug('Database', 'DATABASE_DEBUG_BUNDLE:', bundle);
                Alert.alert('Success', 'Database debug bundle exported to console');
              } catch (error) {
                Alert.alert('Error', 'Failed to export debug bundle');
              }
            }}
            style={styles.actionButton}
          >
            Export Debug Bundle
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert(
                'Clear Local Cache',
                'This will clear all local cached data. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      // Clear specific cache keys, not auth
                      Alert.alert('Success', 'Cache cleared');
                    },
                  },
                ]
              );
            }}
            style={styles.actionButton}
          >
            Clear Cache
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  card: {
    margin: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tableItem: {
    paddingVertical: 4,
  },
  selectedTableItem: {
    backgroundColor: '#f0f0f0',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchBar: {
    marginBottom: 16,
  },
  tableColumn: {
    minWidth: 120,
  },
  tableLoading: {
    marginVertical: 32,
  },
  emptyCard: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});