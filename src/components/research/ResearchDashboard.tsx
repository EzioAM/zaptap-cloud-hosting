import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  ActivityIndicator,
  Divider,
  List,
  Surface,
} from 'react-native-paper';
import { AIResearchService } from '../../services/research/AIResearchService';
import { LocalResearchService, ResearchTopic } from '../../services/research/LocalResearchService';

export const ResearchDashboard: React.FC = () => {
  const [researchTopic, setResearchTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [localResults, setLocalResults] = useState<ResearchTopic[]>([]);
  const [selectedTopics] = useState([
    'Performance Optimization',
    'User Experience', 
    'NFC Implementation',
    'Offline Capabilities',
    'Security Best Practices',
    'Analytics Integration',
  ]);

  const handleResearch = async (topic: string) => {
    setLoading(true);
    try {
      // Try local research first
      const localResult = LocalResearchService.getResearch(topic);
      if (localResult) {
        setLocalResults([localResult]);
      } else {
        // Search for partial matches
        const searchResults = LocalResearchService.searchTopics(topic);
        setLocalResults(searchResults);
      }

      // TODO: Add API fallback when keys are working
      // const researcher = new AIResearchService(
      //   process.env.CLAUDE_API_KEY!,
      //   process.env.OPENAI_API_KEY!
      // );
    } catch (error) {
      console.error('Research failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLocalResult = (result: ResearchTopic) => (
    <Card key={result.topic} style={styles.resultCard}>
      <Card.Title 
        title={result.topic}
        subtitle={`${result.insights.length} insights, ${result.recommendations.length} recommendations`}
      />
      <Card.Content>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {result.insights.map((insight, index) => (
          <Surface key={index} style={styles.insightItem}>
            <Text>{insight}</Text>
          </Surface>
        ))}

        <Text style={styles.sectionTitle}>Recommendations</Text>
        {result.recommendations.map((rec, index) => (
          <List.Item
            key={index}
            title={rec}
            left={props => <List.Icon {...props} icon="lightbulb" />}
          />
        ))}

        {result.codeExamples.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Code Examples</Text>
            {result.codeExamples.map((code, index) => (
              <Surface key={index} style={styles.codeBlock}>
                <Text style={styles.codeText}>{code}</Text>
              </Surface>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Sources</Text>
        {result.sources.map((source, index) => (
          <Text key={index} style={styles.sourceText}>• {source}</Text>
        ))}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>AI Research Assistant</Text>
        <Text style={styles.subtitle}>
          Get insights from Claude and ChatGPT to improve your app
        </Text>

        <Card style={styles.inputCard}>
          <Card.Content>
            <TextInput
              label="Research Topic"
              value={researchTopic}
              onChangeText={setResearchTopic}
              mode="outlined"
              placeholder="E.g., How to improve NFC scanning reliability"
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={() => handleResearch(researchTopic)}
              disabled={!researchTopic || loading}
              loading={loading}
              style={styles.researchButton}
            >
              Research with AI
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.quickTopicsTitle}>Quick Research Topics</Text>
        <View style={styles.chipContainer}>
          {selectedTopics.map(topic => (
            <Chip
              key={topic}
              onPress={() => handleResearch(topic)}
              style={styles.chip}
              mode="outlined"
            >
              {topic}
            </Chip>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              Researching with Claude and ChatGPT...
            </Text>
          </View>
        )}

        {localResults.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.resultsTitle}>Research Results</Text>
            {localResults.map(renderLocalResult)}
          </>
        )}

        {localResults.length === 0 && !loading && researchTopic && (
          <Card style={styles.noResultsCard}>
            <Card.Content>
              <Text style={styles.noResultsTitle}>No results found</Text>
              <Text style={styles.noResultsText}>
                Try searching for: {LocalResearchService.getAllTopics().join(', ')}
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  researchButton: {
    marginTop: 8,
  },
  quickTopicsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  divider: {
    marginVertical: 24,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  resultCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  insightItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  codeBlock: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
  noResultsCard: {
    marginVertical: 20,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});