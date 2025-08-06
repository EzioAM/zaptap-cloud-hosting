import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
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
  Dialog,
  Portal,
  RadioButton,
} from 'react-native-paper';
import { ImprovedAIResearchService } from '../../services/research/ImprovedAIResearchService';
import { CollaborativeAIResearchService } from '../../services/research/CollaborativeAIResearchService';
import { LocalResearchService, ResearchTopic } from '../../services/research/LocalResearchService';
import { CodebaseAnalysisService, CodebaseInsight } from '../../services/research/CodebaseAnalysisService';
import { MockCodeImplementationService as CodeImplementationService, ImplementationResult } from '../../services/developer/MockCodeImplementationService';
import { AICollaborationView } from './AICollaborationView';
import { AIConfigurationHelper } from './AIConfigurationHelper';
import Constants from 'expo-constants';
import { EventLogger } from '../../utils/EventLogger';

export const ResearchDashboardEnhanced: React.FC = () => {
  const [researchTopic, setResearchTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [localResults, setLocalResults] = useState<ResearchTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ResearchTopic | null>(null);
  const [showImplementDialog, setShowImplementDialog] = useState(false);
  const [implementOption, setImplementOption] = useState('suggestions');
  const [dynamicTopics, setDynamicTopics] = useState<string[]>([]);
  const [codebaseInsights, setCodebaseInsights] = useState<CodebaseInsight[]>([]);
  const [implementing, setImplementing] = useState(false);
  const [lastImplementationResult, setLastImplementationResult] = useState<ImplementationResult | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [useCollaborativeAI, setUseCollaborativeAI] = useState(true);
  const [collaborationRounds, setCollaborationRounds] = useState<any[]>([]);
  const [currentCollaborationRound, setCurrentCollaborationRound] = useState(0);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);

  // Load dynamic research topics based on actual codebase
  React.useEffect(() => {
    loadDynamicTopics();
    checkAPIConfiguration();
  }, []);

  const checkAPIConfiguration = () => {
    // Check if API keys are configured
    const aiService = new ImprovedAIResearchService();
    const configStatus = aiService.getConfigStatus();
    
    setHasClaudeKey(configStatus.claudeConfigured);
    setHasOpenAIKey(configStatus.openaiConfigured);
    
    // Show config helper if collaborative AI is enabled but keys are missing
    if (useCollaborativeAI && !configStatus.anyConfigured) {
      setShowConfigHelper(true);
    }
  };

  const loadDynamicTopics = async () => {
    try {
      setLoadingTopics(true);
      
      // Get codebase-specific research topics
      const topics = await CodebaseAnalysisService.getDynamicResearchTopics();
      setDynamicTopics(topics);
      
      // Get high-priority insights for immediate attention
      const insights = await CodebaseAnalysisService.getHighPriorityInsights();
      setCodebaseInsights(insights);
      
      // Also get smart topics from AI service
      const aiService = new ImprovedAIResearchService();
      const smartTopics = await aiService.generateSmartTopics();
      
      // Combine and deduplicate topics
      const allTopics = [...new Set([...topics, ...smartTopics])].slice(0, 12);
      setDynamicTopics(allTopics);
      
      EventLogger.debug('ResearchDashboardEnhanced', '🔍 Dynamic research topics loaded:', allTopics.length);
      EventLogger.debug('ResearchDashboardEnhanced', '⚠️ High-priority insights:', insights.length);
    } catch (error) {
      EventLogger.error('ResearchDashboardEnhanced', 'Failed to load dynamic topics:', error as Error);
      // Use smart fallback topics
      const aiService = new ImprovedAIResearchService();
      const fallbackTopics = await aiService.generateSmartTopics();
      setDynamicTopics(fallbackTopics);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleResearch = async (topic: string) => {
    setLoading(true);
    setResearchTopic(topic);
    setCollaborationRounds([]);
    setCurrentCollaborationRound(0);
    setShowCollaboration(false);
    
    try {
      if (useCollaborativeAI) {
        // Check if API keys are configured
        checkAPIConfiguration();
        
        if (!hasClaudeKey && !hasOpenAIKey) {
          setShowCollaboration(false);
          Alert.alert(
            '🔧 API Configuration Required',
            'To use collaborative AI research, you need to configure API keys for Claude and/or ChatGPT. Would you like to see setup instructions?',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Show Instructions', 
                onPress: () => setShowConfigHelper(true) 
              }
            ]
          );
          // Fall through to regular AI research
        } else {
          // Try collaborative AI research first
          const collaborativeService = new CollaborativeAIResearchService();
          
          EventLogger.debug('ResearchDashboardEnhanced', '🤝 Starting collaborative AI research...');
          setShowCollaboration(true);
          
          // Simulate real-time collaboration updates
          const updateRound = (round: number) => {
            setCurrentCollaborationRound(round);
          };
          
          try {
            const collaborativeResult = await collaborativeService.collaborativeResearch({
              topic,
              context: 'Mobile automation app built with React Native, TypeScript, Redux Toolkit, Supabase',
              specificQuestions: [
                `How to implement ${topic} in a React Native app?`,
                'What are the best practices and patterns?',
                'What are common pitfalls to avoid?'
              ],
              focusAreas: ['implementation', 'best practices', 'performance', 'testing']
            });
            
            // Update collaboration rounds for display
            setCollaborationRounds(collaborativeResult.rounds);
            
            // Convert to ResearchTopic
            const researchTopic = collaborativeService.toResearchTopic(collaborativeResult);
            setLocalResults([researchTopic]);
            
            Alert.alert(
              'AI Collaboration Complete! 🎉',
              `${collaborativeResult.rounds.length} rounds of collaboration completed. ${collaborativeResult.collaborationSummary}`,
              [
                { text: 'View Results', onPress: () => setSelectedTopic(researchTopic) },
                { text: 'OK' }
              ]
            );
            
            return;
          } catch (collabError) {
            EventLogger.debug('ResearchDashboardEnhanced', 'Collaborative AI not available, falling back...');
            setShowCollaboration(false);
          }
        }
      }
      
      // Fallback to improved AI research service
      const researcher = new ImprovedAIResearchService();
      const results = await researcher.researchAppImprovements({
        topic,
        specificQuestions: [`How to implement ${topic} in a React Native app?`],
        focusAreas: ['implementation', 'best practices', 'code examples'],
        outputFormat: 'structured'
      });
      
      if (results && results.length > 0) {
        // Convert results to ResearchTopic format
        const researchTopics: ResearchTopic[] = results.map(result => ({
          topic,
          insights: result.insights,
          recommendations: result.recommendations,
          codeExamples: result.codeExamples || [],
          sources: result.sources || [`${result.provider} Analysis`],
          lastUpdated: new Date().toISOString()
        }));
        
        setLocalResults(researchTopics);
        EventLogger.debug('ResearchDashboardEnhanced', '✅ Research completed: ${results.length} results');
      } else {
        // Fallback to pure local research
        const localResult = LocalResearchService.getResearch(topic);
        if (localResult) {
          setLocalResults([localResult]);
        } else {
          const searchResults = LocalResearchService.searchTopics(topic);
          setLocalResults(searchResults);
        }
      }
    } catch (error) {
      EventLogger.error('ResearchDashboardEnhanced', 'Research failed:', error as Error);
      Alert.alert(
        'Research Error',
        'Unable to complete research. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setShowCollaboration(false);
    }
  };

  const handleImplementChanges = async () => {
    if (!selectedTopic) return;

    setShowImplementDialog(false);
    setImplementing(true);

    try {
      switch (implementOption) {
        case 'suggestions':
          showImplementationGuide();
          break;
        case 'component':
          await generateComponentCode();
          break;
        case 'tests':
          await generateTests();
          break;
        case 'full':
          await fullImplementation();
          break;
      }
    } catch (error) {
      EventLogger.error('ResearchDashboardEnhanced', 'Implementation failed:', error as Error);
      Alert.alert('Implementation Error', error.message || 'Failed to implement changes');
    } finally {
      setImplementing(false);
    }
  };

  const showImplementationGuide = () => {
    Alert.alert(
      'Implementation Guide',
      `To implement ${selectedTopic.topic}:\n\n1. Analyze the recommendations\n2. Create necessary files\n3. Update existing components\n4. Add required dependencies\n5. Test thoroughly\n\nUse the terminal commands:\n• npm run analyze\n• npm run implement`,
      [{ text: 'OK' }]
    );
  };

  const generateComponentCode = async () => {
    if (!selectedTopic) return;

    try {
      const result = await CodeImplementationService.implementChanges(
        selectedTopic.topic,
        selectedTopic.recommendations.slice(0, 3), // Top 3 recommendations
        selectedTopic.codeExamples
      );

      setLastImplementationResult(result);

      if (result.success) {
        Alert.alert(
          'Code Generation Successful! 🎉',
          `Generated ${result.changesApplied.length} components/files:\n\n${result.changesApplied.map(c => `• ${c.description}`).join('\n')}\n\n${result.buildRequired ? '🔨 EAS Build required' : '📱 EAS Update will be triggered'}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: result.buildRequired ? 'Start Build' : 'Deploy Update',
              onPress: () => handleDeployment(result)
            }
          ]
        );
      } else {
        Alert.alert(
          'Partial Implementation',
          `${result.changesApplied.length} changes applied successfully.\n\nErrors:\n${result.errors.join('\n')}\n\nRollback available.`,
          [
            { text: 'Keep Changes' },
            { text: 'Rollback', onPress: () => handleRollback() }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Implementation Failed', `Error: ${error.message}\n\nNo changes were applied.`);
    }
  };

  const generateTests = async () => {
    if (!selectedTopic) return;

    Alert.alert(
      'Test Generation',
      `Generating comprehensive tests for ${selectedTopic.topic}...\n\nThis will create:\n• Unit tests\n• Integration tests\n• E2E test scenarios\n\nProceed with test generation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate Tests',
          onPress: async () => {
            // Use the same implementation service but with test-focused changes
            try {
              const result = await CodeImplementationService.implementChanges(
                `${selectedTopic.topic} Testing`,
                [`Create comprehensive tests for ${selectedTopic.topic}`],
                []
              );
              
              Alert.alert('Tests Generated', `Created ${result.changesApplied.length} test files successfully!`);
            } catch (error) {
              Alert.alert('Test Generation Failed', error.message);
            }
          }
        }
      ]
    );
  };

  const fullImplementation = async () => {
    if (!selectedTopic) return;

    Alert.alert(
      '⚠️ Full Auto-Implementation',
      `This will automatically implement ALL recommendations for ${selectedTopic.topic}:\n\n• Generate code components\n• Update existing files\n• Add dependencies\n• Create tests\n• Deploy changes\n\n🚨 This is a powerful feature that makes significant changes!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await CodeImplementationService.implementChanges(
                selectedTopic.topic,
                selectedTopic.recommendations, // All recommendations
                selectedTopic.codeExamples
              );

              setLastImplementationResult(result);

              if (result.success) {
                Alert.alert(
                  'Full Implementation Complete! 🚀',
                  `Successfully implemented:\n• ${result.changesApplied.length} changes applied\n• ${result.buildRequired ? 'Build' : 'Update'} required\n\nDeploy now?`,
                  [
                    { text: 'Deploy Later' },
                    { text: 'Deploy Now', onPress: () => handleDeployment(result) }
                  ]
                );
              } else {
                Alert.alert('Implementation Issues', `${result.errors.length} errors occurred. Check logs and consider rollback.`);
              }
            } catch (error) {
              Alert.alert('Full Implementation Failed', `Critical error: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleDeployment = async (result: ImplementationResult) => {
    try {
      setImplementing(true);
      const deployResult = await CodeImplementationService.executeDeployment(result);
      
      Alert.alert(
        deployResult.success ? 'Deployment Started! 🚀' : 'Deployment Failed',
        deployResult.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Deployment Error', error.message);
    } finally {
      setImplementing(false);
    }
  };

  const handleRollback = async () => {
    try {
      const rollbackResult = await CodeImplementationService.rollbackLastImplementation();
      Alert.alert(
        rollbackResult.success ? 'Rollback Complete' : 'Rollback Failed',
        rollbackResult.message
      );
    } catch (error) {
      Alert.alert('Rollback Error', error.message);
    }
  };

  const handleInsightCardPress = (insight: CodebaseInsight) => {
    Alert.alert(
      insight.title,
      `${insight.description}\n\nAffected Files:\n${insight.affectedFiles.join(', ')}\n\nSuggested Actions:\n${insight.suggestedActions.map(action => `• ${action}`).join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Research Solution', onPress: () => handleResearchSolution(insight) }
      ]
    );
  };

  const handleResearchSolution = async (insight: CodebaseInsight) => {
    setLoading(true);
    setResearchTopic(insight.researchTopic);
    
    try {
      EventLogger.debug('ResearchDashboardEnhanced', '🤖 Starting AI research for:', insight.researchTopic);
      
      // Initialize improved AI research service
      const aiResearchService = new ImprovedAIResearchService();
      
      const configStatus = aiResearchService.getConfigStatus();
      EventLogger.debug('ResearchDashboardEnhanced', '🚀 AI Research Service Config:', configStatus);
      
      if (!configStatus.anyConfigured) {
        EventLogger.debug('ResearchDashboardEnhanced', '⚠️ AI APIs not configured, using enhanced local research');
      }
      
      // Create comprehensive research query with codebase context
      const researchQuery = {
        topic: insight.researchTopic,
        context: `Mobile automation app built with React Native, TypeScript, Redux Toolkit, Supabase. 
                  Current issue: ${insight.title}
                  Priority: ${insight.priority}
                  Affected files: ${insight.affectedFiles.join(', ')}
                  Current tech stack: React Native Paper, Material Design 3, NFC capabilities, QR scanning`,
        specificQuestions: [
          `How to solve: ${insight.title}`,
          `Best practices for ${insight.category} in React Native apps`,
          `Code implementation for: ${insight.description}`,
          `Testing strategy for this solution`,
          `Performance considerations and potential trade-offs`
        ]
      };

      EventLogger.debug('ResearchDashboardEnhanced', '📝 Research query created:', researchQuery.topic);

      // Query both AI services for comprehensive insights
      const aiResults = await aiResearchService.researchAppImprovements(researchQuery);
      
      if (aiResults && aiResults.length > 0) {
        EventLogger.debug('ResearchDashboardEnhanced', '✅ AI research completed:', aiResults.length, 'providers responded');
        
        // Convert AI results to our ResearchTopic format
        const researchTopic: ResearchTopic = {
          topic: insight.researchTopic,
          insights: [],
          recommendations: [],
          codeExamples: [],
          sources: [],
          lastUpdated: new Date().toISOString()
        };

        // Combine insights from all AI providers
        aiResults.forEach(result => {
          researchTopic.insights.push(...result.insights);
          researchTopic.recommendations.push(...result.recommendations);
          if (result.codeExamples) {
            researchTopic.codeExamples.push(...result.codeExamples);
          }
          researchTopic.sources.push(`${result.provider.toUpperCase()} AI Analysis`);
        });

        // Remove duplicates and limit results
        researchTopic.insights = [...new Set(researchTopic.insights)].slice(0, 8);
        researchTopic.recommendations = [...new Set(researchTopic.recommendations)].slice(0, 10);
        researchTopic.codeExamples = [...new Set(researchTopic.codeExamples)].slice(0, 5);

        EventLogger.debug('ResearchDashboardEnhanced', '📊 Research processed:', {
          insights: researchTopic.insights.length,
          recommendations: researchTopic.recommendations.length,
          codeExamples: researchTopic.codeExamples.length
        });

        setLocalResults([researchTopic]);
        
        Alert.alert(
          'Research Complete! 🎉',
          `Generated ${researchTopic.insights.length} insights and ${researchTopic.recommendations.length} recommendations.\n\nReview the detailed analysis below.`,
          [
            { text: 'View Results', onPress: () => setSelectedTopic(researchTopic) },
            { text: 'OK' }
          ]
        );
      } else {
        // Fallback to local research
        EventLogger.debug('ResearchDashboardEnhanced', '⚠️ AI research failed, using local fallback');
        const localResult = LocalResearchService.getResearch(insight.researchTopic);
        if (localResult) {
          setLocalResults([localResult]);
          Alert.alert(
            'Research Complete',
            'Using enhanced local research data.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No Research Available',
            `No research data found for "${insight.researchTopic}". Try a different topic or check your API configuration.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      EventLogger.error('ResearchDashboardEnhanced', 'Research failed:', error as Error);
      Alert.alert(
        'Research Failed',
        `Unable to complete research: ${error.message}\n\nPlease try again or select a different topic.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewInsightDetails = (insight: CodebaseInsight) => {
    Alert.alert(
      `${insight.category.toUpperCase()}: ${insight.title}`,
      `Priority: ${insight.priority.toUpperCase()}\n\n` +
      `Description:\n${insight.description}\n\n` +
      `Affected Files:\n${insight.affectedFiles.map(file => `• ${file}`).join('\n')}\n\n` +
      `Suggested Actions:\n${insight.suggestedActions.map(action => `• ${action}`).join('\n')}\n\n` +
      `Research Topic: ${insight.researchTopic}`,
      [
        { text: 'Research Solution', onPress: () => handleResearchSolution(insight) },
        { text: 'Close' }
      ]
    );
  };

  const renderLocalResult = (result: ResearchTopic) => (
    <Card key={result.topic} style={styles.resultCard}>
      <Card.Title 
        title={result.topic}
        subtitle={`${result.insights.length} insights, ${result.recommendations.length} recommendations`}
      />
      <Card.Content>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {result.insights.slice(0, 3).map((insight, index) => (
          <Surface key={index} style={styles.insightItem}>
            <Text>{insight}</Text>
          </Surface>
        ))}

        <Text style={styles.sectionTitle}>Top Recommendations</Text>
        {result.recommendations.slice(0, 3).map((rec, index) => (
          <List.Item
            key={index}
            title={rec}
            left={props => <List.Icon {...props} icon="lightbulb" />}
          />
        ))}

        {result.codeExamples.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Code Example</Text>
            <Surface style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {result.codeExamples[0].substring(0, 200)}...
              </Text>
            </Surface>
          </>
        )}
      </Card.Content>
      <Card.Actions>
        <Button 
          onPress={() => setSelectedTopic(result)}
        >
          View Details
        </Button>
        <Button 
          mode="contained"
          onPress={() => {
            setSelectedTopic(result);
            setShowImplementDialog(true);
          }}
        >
          Implement
        </Button>
      </Card.Actions>
    </Card>
  );

  if (selectedTopic) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <Button
              mode="outlined"
              onPress={() => setSelectedTopic(null)}
              style={styles.backButton}
            >
              Back to Results
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowImplementDialog(true)}
              style={[styles.backButton, { backgroundColor: implementing ? '#FF9800' : '#4CAF50' }]}
              loading={implementing}
              disabled={implementing}
              icon={implementing ? "cog" : "rocket"}
            >
              {implementing ? 'Implementing...' : 'Push to Code'}
            </Button>
            
            {lastImplementationResult && (
              <View style={styles.implementationStatus}>
                <Text style={styles.statusText}>
                  Last: {lastImplementationResult.success ? '✅' : '⚠️'} 
                  {lastImplementationResult.changesApplied.length} changes 
                  {lastImplementationResult.buildRequired ? ' (Build req.)' : ' (Update req.)'}
                </Text>
                {!lastImplementationResult.success && (
                  <Button 
                    mode="text" 
                    onPress={handleRollback}
                    compact
                    textColor="#F44336"
                  >
                    Rollback
                  </Button>
                )}
              </View>
            )}
          </View>

          <Card style={styles.detailCard}>
            <Card.Title title={selectedTopic.topic} />
            <Card.Content>
              <Text style={styles.sectionTitle}>All Insights</Text>
              {selectedTopic.insights.map((insight, index) => (
                <Surface key={index} style={styles.insightItem}>
                  <Text>{insight}</Text>
                </Surface>
              ))}

              <Text style={styles.sectionTitle}>All Recommendations</Text>
              {selectedTopic.recommendations.map((rec, index) => (
                <List.Item
                  key={index}
                  title={rec}
                  left={props => <List.Icon {...props} icon="lightbulb" />}
                />
              ))}

              {selectedTopic.codeExamples.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Code Examples</Text>
                  {selectedTopic.codeExamples.map((code, index) => (
                    <Surface key={index} style={styles.codeBlock}>
                      <Text style={styles.codeText}>{code}</Text>
                    </Surface>
                  ))}
                </>
              )}

              <Text style={styles.sectionTitle}>Sources</Text>
              {selectedTopic.sources.map((source, index) => (
                <Text key={index} style={styles.sourceText}>• {source}</Text>
              ))}
            </Card.Content>
          </Card>
        </ScrollView>

        <Portal>
          <Dialog visible={showImplementDialog} onDismiss={() => setShowImplementDialog(false)}>
            <Dialog.Title>Implementation Options</Dialog.Title>
            <Dialog.Content>
              <RadioButton.Group onValueChange={setImplementOption} value={implementOption}>
                <RadioButton.Item label="View implementation suggestions" value="suggestions" />
                <RadioButton.Item label="Generate component code" value="component" />
                <RadioButton.Item label="Create automated tests" value="tests" />
                <RadioButton.Item label="Full auto-implementation (Advanced)" value="full" />
              </RadioButton.Group>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowImplementDialog(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleImplementChanges}>Proceed</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>AI Research Assistant</Text>
        <Text style={styles.subtitle}>
          Research improvements and push changes directly to your codebase
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
            <View style={styles.researchControls}>
              <Button
                mode="contained"
                onPress={() => handleResearch(researchTopic)}
                disabled={!researchTopic || loading}
                loading={loading}
                style={styles.researchButton}
                icon={useCollaborativeAI ? "brain" : "magnify"}
              >
                {useCollaborativeAI ? 'Collaborative AI Research' : 'Research with AI'}
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  setUseCollaborativeAI(!useCollaborativeAI);
                  if (!useCollaborativeAI) {
                    checkAPIConfiguration();
                  }
                }}
                style={styles.toggleButton}
                compact
              >
                {useCollaborativeAI ? 'Simple' : 'Collab'}
              </Button>
              {useCollaborativeAI && (!hasClaudeKey || !hasOpenAIKey) && (
                <Button
                  mode="text"
                  onPress={() => setShowConfigHelper(true)}
                  style={styles.toggleButton}
                  compact
                  icon="cog"
                >
                  Config
                </Button>
              )}
            </View>
            {useCollaborativeAI && (
              <Text style={styles.collaborativeHint}>
                🤝 Claude and ChatGPT will bounce ideas off each other
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Show configuration helper if needed */}
        {showConfigHelper && useCollaborativeAI && (
          <AIConfigurationHelper
            hasClaudeKey={hasClaudeKey}
            hasOpenAIKey={hasOpenAIKey}
            onDismiss={() => setShowConfigHelper(false)}
          />
        )}

        {codebaseInsights.length > 0 && (
          <>
            <Text style={styles.insightsTitle}>🔥 High-Priority Codebase Insights</Text>
            <View style={styles.insightsContainer}>
              {codebaseInsights.slice(0, 3).map((insight, index) => (
                <Card 
                  key={insight.title + index} 
                  style={styles.insightCard}
                  onPress={() => handleInsightCardPress(insight)}
                  mode="elevated"
                >
                  <Card.Content>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightCategory}>{insight.category.toUpperCase()}</Text>
                      <Chip 
                        mode="outlined" 
                        textStyle={{ fontSize: 10 }}
                        style={[styles.priorityChip, { 
                          backgroundColor: insight.priority === 'high' ? '#FFEBEE' : '#FFF3E0' 
                        }]}
                      >
                        {insight.priority}
                      </Chip>
                    </View>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                    <View style={styles.insightActions}>
                      <Button
                        mode="outlined"
                        onPress={() => handleResearchSolution(insight)}
                        style={styles.insightButton}
                        compact
                        loading={loading && researchTopic === insight.researchTopic}
                        disabled={loading}
                      >
                        Research Solution
                      </Button>
                      <Button
                        mode="text"
                        onPress={() => handleViewInsightDetails(insight)}
                        compact
                        textColor="#6200EE"
                      >
                        View Details
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </>
        )}

        <Text style={styles.quickTopicsTitle}>
          📊 Codebase-Specific Research Topics
          {loadingTopics && <ActivityIndicator size="small" style={{ marginLeft: 8 }} />}
        </Text>
        <View style={styles.chipContainer}>
          {dynamicTopics.map(topic => (
            <Chip
              key={topic}
              onPress={() => handleResearch(topic)}
              style={styles.chip}
              mode="outlined"
              icon="code-tags"
            >
              {topic}
            </Chip>
          ))}
          
          {dynamicTopics.length === 0 && !loadingTopics && (
            <Text style={styles.noTopicsText}>
              Unable to analyze codebase. Using fallback topics.
            </Text>
          )}
        </View>

        {loading && !showCollaboration && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              Researching solutions...
            </Text>
          </View>
        )}
        
        {showCollaboration && (
          <AICollaborationView
            rounds={collaborationRounds}
            isLoading={loading}
            currentRound={currentCollaborationRound}
            collaborationSummary={loading ? undefined : 'AI collaboration complete'}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    flex: 1,
  },
  researchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    marginTop: 8,
  },
  collaborativeHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
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
  detailCard: {
    margin: 0,
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
  backButton: {
    marginBottom: 8,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#D32F2F',
  },
  insightsContainer: {
    marginBottom: 24,
  },
  insightCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5722',
  },
  priorityChip: {
    height: 24,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  insightButton: {
    alignSelf: 'flex-start',
  },
  noTopicsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  implementationStatus: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  insightActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});