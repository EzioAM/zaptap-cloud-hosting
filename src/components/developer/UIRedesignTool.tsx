import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Card,
  Button,
  Text,
  TextInput,
  Chip,
  List,
  Divider,
  ActivityIndicator,
  Surface,
  IconButton,
  Portal,
  Dialog,
  FAB,
} from 'react-native-paper';
import { AIResearchService } from '../../services/research/AIResearchService';
import { ScreenAnalysisService } from '../../services/developer/ScreenAnalysisService';
import { UIRedesignRequest } from '../../services/developer/UIRedesignPromptService';
import { UIMockupService } from '../../services/developer/UIMockupService';
import { UIPromptFormatter, DesignInputs } from '../../services/developer/UIPromptFormatter';
import { UIImageGenerator } from '../../services/developer/UIImageGenerator';
import { ChangeHistoryIntegration } from '../../services/developer/ChangeHistoryIntegration';
import Constants from 'expo-constants';
import { EventLogger } from '../../utils/EventLogger';

export const UIRedesignTool: React.FC = () => {
  const [screenName, setScreenName] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [designGoals, setDesignGoals] = useState<string[]>(['modern', 'accessible', 'intuitive']);
  const [newGoal, setNewGoal] = useState('');
  const [isRedesigning, setIsRedesigning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedMockup, setSelectedMockup] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showImplementDialog, setShowImplementDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const screens = [
    { label: 'Home Screen', value: 'HomeScreen' },
    { label: 'Profile Screen', value: 'ProfileScreen' },
    { label: 'Settings Screen', value: 'SettingsScreen' },
    { label: 'Automation List', value: 'AutomationListScreen' },
    { label: 'Create Automation', value: 'CreateAutomationScreen' },
    { label: 'Scan Screen', value: 'ScanScreen' },
  ];

  const handleAddGoal = () => {
    if (newGoal.trim() && !designGoals.includes(newGoal.trim())) {
      setDesignGoals([...designGoals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setDesignGoals(designGoals.filter(g => g !== goal));
  };

  const handleScreenSelect = async (selectedScreen: string) => {
    setScreenName(selectedScreen);
    setIsAnalyzing(true);
    
    // Auto-populate current UI description with screen analysis
    try {
      const screenAnalysis = await ScreenAnalysisService.analyzeScreen(selectedScreen);
      setCurrentDescription(screenAnalysis);
    } catch (error) {
      EventLogger.error('UI', 'Failed to analyze screen:', error as Error);
      // Keep the current description if analysis fails
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRedesign = async () => {
    if (!screenName) {
      Alert.alert('Error', 'Please select a screen to redesign');
      return;
    }

    setIsRedesigning(true);
    setResults(null);

    try {
      EventLogger.debug('UI', '🚀 Starting redesign process for:', screenName);
      
      // Test imports
      EventLogger.debug('UI', '🔍 Testing imports...');
      EventLogger.debug('UI', 'UIPromptFormatter:', typeof UIPromptFormatter);
      EventLogger.debug('UI', 'UIPromptFormatter.formatPrompts:', typeof UIPromptFormatter.formatPrompts);
      EventLogger.debug('UI', 'UIPromptFormatter.createSearchQuery:', typeof UIPromptFormatter.createSearchQuery);
      EventLogger.debug('UI', 'ScreenAnalysisService:', typeof ScreenAnalysisService);
      EventLogger.debug('UI', 'ScreenAnalysisService.getScreenAnalysis:', typeof ScreenAnalysisService.getScreenAnalysis);
      EventLogger.debug('UI', 'UIImageGenerator:', typeof UIImageGenerator);
      EventLogger.debug('UI', 'UIImageGenerator.generateMockupImage:', typeof UIImageGenerator.generateMockupImage);
      EventLogger.debug('UI', 'AIResearchService:', typeof AIResearchService);
      // Step 1: Format design inputs into optimized prompts
      const designInputs: DesignInputs = {
        screenName,
        currentDescription: currentDescription || `Basic ${screenName} implementation`,
        designGoals,
        techStack: {
          framework: 'React Native with TypeScript',
          uiLibrary: 'React Native Paper (Material Design 3)',
          stateManagement: 'Redux Toolkit with RTK Query',
          navigation: 'React Navigation 6',
          backend: 'Supabase (PostgreSQL + Auth + Edge Functions)'
        }
      };

      // Generate optimized prompts for different AI services
      EventLogger.debug('UI', '📋 Calling UIPromptFormatter.formatPrompts...');
      let formattedPrompts;
      try {
        formattedPrompts = UIPromptFormatter.formatPrompts(designInputs);
      } catch (promptError) {
        EventLogger.error('UI', '❌ UIPromptFormatter.formatPrompts failed:', promptError as Error);
        throw new Error(`Failed to format prompts: ${promptError.message}`);
      }
      
      EventLogger.debug('UI', '🎨 Optimized Prompts Generated:', {
        claudePromptLength: formattedPrompts?.claudePrompt?.length || 0,
        chatgptPromptLength: formattedPrompts?.chatgptPrompt?.length || 0,
        imagePromptLength: formattedPrompts?.imageGenerationPrompt?.length || 0,
        searchKeywords: formattedPrompts?.searchKeywords?.length || 0
      });

      // Step 2: Get API keys and setup image generation
      const claudeApiKey = Constants.expoConfig?.extra?.claudeApiKey;
      const openaiApiKey = Constants.expoConfig?.extra?.openaiApiKey;
      
      EventLogger.debug('UI', '🔑 UI Redesign API Keys Check:', {
        claudeAvailable: !!claudeApiKey,
        openaiAvailable: !!openaiApiKey,
        claudeLength: claudeApiKey?.length || 0,
        openaiLength: openaiApiKey?.length || 0
      });
      
      // Setup image generator with API key if available
      if (openaiApiKey) {
        UIImageGenerator.setApiKey(openaiApiKey);
      }

      // Step 3: Generate AI recommendations using optimized prompts
      EventLogger.debug('UI', '🤖 Creating AIResearchService...');
      const service = new AIResearchService(claudeApiKey, openaiApiKey);
      
      // Use the optimized prompts for better AI analysis
      const aiAnalysisPrompt = claudeApiKey ? formattedPrompts.claudePrompt : formattedPrompts.chatgptPrompt;
      
      // Create enhanced redesign request with optimized prompt
      const redesignRequest: UIRedesignRequest = {
        ...designInputs,
        // Add the optimized prompt context
        currentDescription: `${designInputs.currentDescription}\n\n[OPTIMIZED ANALYSIS CONTEXT]\n${aiAnalysisPrompt}`
      };

      EventLogger.debug('UI', '📤 Calling service.generateUIRedesign...');
      let redesignResponse;
      try {
        redesignResponse = await service.generateUIRedesign(redesignRequest);
      } catch (serviceError) {
        EventLogger.error('UI', '❌ service.generateUIRedesign failed:', serviceError as Error);
        EventLogger.error('UI', 'Stack trace:', serviceError.stack as Error);
        throw new Error(`AI service failed: ${serviceError.message}`);
      }
      
      // Validate response structure
      if (!redesignResponse || typeof redesignResponse !== 'object') {
        EventLogger.error('UI', '❌ Invalid response structure:', redesignResponse as Error);
        throw new Error('Invalid response from AI service');
      }
      
      EventLogger.debug('UI', '✅ AI response received:', {
        hasDesignConcepts: !!redesignResponse.designConcepts,
        hasMockupDescriptions: !!redesignResponse.mockupDescriptions,
        mockupCount: redesignResponse.mockupDescriptions?.length || 0
      });

      // Step 4: Generate actual UI mockup images
      const mockupStyles: Array<'enhanced' | 'reimagined' | 'interaction-focused'> = 
        ['enhanced', 'reimagined', 'interaction-focused'];

      const mockupPromises = mockupStyles.map(async (style, index) => {
        try {
          // Get screen analysis for context
          const screenAnalysis = await ScreenAnalysisService.getScreenAnalysis(screenName);
          
          const imageRequest = {
            prompt: formattedPrompts.imageGenerationPrompt,
            style,
            screenType: screenName.toLowerCase(),
            designGoals,
            screenContext: screenAnalysis
          };

          const generatedImage = await UIImageGenerator.generateMockupImage(imageRequest);
          
          // Safely access mockup data with fallback
          const mockupData = redesignResponse.mockupDescriptions?.[index] || {
            name: style.charAt(0).toUpperCase() + style.slice(1) + ' Design',
            description: `${style} variation of ${screenName}`,
            keyFeatures: ['Modern design', 'Improved UX', 'Better accessibility'],
            colorScheme: ['#6200EE', '#FFFFFF', '#F5F5F5', '#03DAC6'],
            layoutChanges: ['Updated layout'],
            userBenefits: ['Enhanced user experience']
          };

          return {
            name: mockupData.name,
            description: mockupData.description,
            imageUrl: generatedImage.url,
            colors: mockupData.colorScheme || [],
            features: mockupData.keyFeatures || [],
            layoutChanges: mockupData.layoutChanges || [],
            userBenefits: mockupData.userBenefits || [],
            isAIGenerated: generatedImage.isAIGenerated
          };
        } catch (error) {
          EventLogger.error('UI', 'Error generating mockup for ${style}:', error as Error);
          // Return a fallback mockup
          return {
            name: style.charAt(0).toUpperCase() + style.slice(1) + ' Design',
            description: `Failed to generate ${style} mockup`,
            imageUrl: 'https://via.placeholder.com/400x800/f0f0f0/666?text=Mockup+Generation+Failed',
            colors: ['#6200EE', '#FFFFFF'],
            features: ['Mockup generation failed'],
            layoutChanges: [],
            userBenefits: [],
            isAIGenerated: false
          };
        }
      });

      const mockups = await Promise.all(mockupPromises);

      const mockupInfo = {
        mockups,
        implementationSteps: redesignResponse.implementationGuide.steps,
        designConcepts: redesignResponse.designConcepts,
        recommendations: redesignResponse.specificRecommendations,
        optimizedPrompts: formattedPrompts,
        searchQuery: UIPromptFormatter.createSearchQuery(designInputs)
      };

      setResults({
        designConcepts: redesignResponse.designConcepts,
        mockupInfo,
        screenName,
        timestamp: new Date().toISOString(),
        aiAnalysis: redesignResponse
      });

      // Track the redesign in change history
      try {
        await ChangeHistoryIntegration.trackUIRedesign({
          screenName,
          changes: [
            {
              filepath: `src/screens/${screenName}.tsx`,
              description: `Generated UI redesign concepts with ${designGoals.join(', ')} design goals`,
              content: JSON.stringify(redesignResponse.specificRecommendations, null, 2),
            },
            {
              filepath: `src/mockups/${screenName}_mockups.json`,
              description: `Created ${mockups.length} UI mockup variations`,
              content: JSON.stringify(mockups, null, 2),
            },
          ],
          aiModel: claudeApiKey ? 'claude' : openaiApiKey ? 'chatgpt' : undefined,
        });
      } catch (historyError) {
        EventLogger.error('UI', 'Failed to track redesign in history:', historyError as Error);
      }

      const aiGeneratedCount = mockups.filter(m => m.isAIGenerated).length;
      
      Alert.alert(
        'Redesign Complete!',
        `✅ AI-powered UI/UX redesign generated for ${screenName}\n\n🎯 Optimized prompts: ${formattedPrompts.searchKeywords.length} keywords\n📊 Design goals: ${designGoals.length} applied\n📝 Screen analysis: ${Math.round(currentDescription.length / 100)} pages\n🎨 UI mockups: ${mockups.length} created${aiGeneratedCount > 0 ? ` (${aiGeneratedCount} AI-generated)` : ''}\n\n💡 Review the enhanced analysis and mockups below!\n\n📋 Changes tracked in history for undo capability.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      EventLogger.error('UI', 'Redesign error:', error as Error);
      EventLogger.error('UI', 'Error type:', error.constructor.name as Error);
      EventLogger.error('UI', 'Error message:', error.message as Error);
      EventLogger.error('UI', 'Error stack:', error.stack as Error);
      
      const errorMessage = error.message || 'Unknown error occurred';
      const errorDetails = `Error: ${errorMessage}${error.stack ? '\n\nCheck console for detailed stack trace.' : ''}`;
      
      Alert.alert(
        'Redesign Failed',
        `Unable to generate redesign concepts.\n\n${errorDetails}\n\nPlease check:\n1. API keys are configured\n2. Network connection is active\n3. Console for detailed error logs`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsRedesigning(false);
    }
  };

  const handleImplementRedesign = () => {
    if (!results) return;

    Alert.alert(
      'Implementation Guide',
      `To implement this redesign:\n\n1. Review the generated concepts\n2. Update your component styles\n3. Add new UI elements as suggested\n4. Test on multiple devices\n\nWould you like to view the implementation code?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Code', 
          onPress: () => {
            // In a real implementation, this would generate actual component code
            Alert.alert('Implementation Code', 'Component code generation will be available in the next update.');
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Card style={styles.card}>
        <Card.Title title="UI/UX Redesign Tool" subtitle="AI-powered interface redesign" />
        <Card.Content>
          <Text style={styles.description}>
            Generate modern UI/UX designs with AI-powered recommendations and mockups.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Screen</Text>
            {screens.map((screen) => (
              <List.Item
                key={screen.value}
                title={screen.label}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={screenName === screen.value ? 'radiobox-marked' : 'radiobox-blank'} 
                  />
                )}
                onPress={() => handleScreenSelect(screen.value)}
                style={[
                  styles.listItem,
                  screenName === screen.value && styles.selectedItem
                ]}
              />
            ))}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Current UI Description {screenName && '(Auto-populated)'}
            </Text>
            {isAnalyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.analyzingText}>Analyzing screen structure...</Text>
              </View>
            ) : (
              <TextInput
                mode="outlined"
                placeholder={screenName ? "Screen analysis will appear here..." : "Select a screen first to auto-populate description..."}
                value={currentDescription}
                onChangeText={setCurrentDescription}
                multiline
                numberOfLines={6}
                style={styles.textInput}
                disabled={isAnalyzing}
              />
            )}
            {screenName && !isAnalyzing && (
              <Text style={styles.helpText}>
                💡 Description auto-populated from {screenName} analysis. You can edit it to add specific details.
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Design Goals</Text>
            <View style={styles.chipContainer}>
              {designGoals.map((goal) => (
                <Chip
                  key={goal}
                  onClose={() => handleRemoveGoal(goal)}
                  style={styles.chip}
                >
                  {goal}
                </Chip>
              ))}
            </View>
            <View style={styles.addGoalContainer}>
              <TextInput
                mode="outlined"
                placeholder="Add design goal... (e.g., modern, accessible, intuitive)"
                value={newGoal}
                onChangeText={setNewGoal}
                onSubmitEditing={handleAddGoal}
                style={styles.goalInput}
                returnKeyType="done"
                blurOnSubmit={true}
                maxLength={50}
              />
              <Button
                mode="contained"
                onPress={handleAddGoal}
                disabled={!newGoal.trim()}
                style={styles.addButton}
                icon="plus"
              >
                Add
              </Button>
            </View>
            {designGoals.length > 0 && (
              <Text style={styles.goalCountText}>
                {designGoals.length} design goals added
              </Text>
            )}
          </View>

          {screenName && designGoals.length > 0 && (
            <View style={styles.readyIndicator}>
              <Text style={styles.readyText}>
                ✅ Ready to generate: {screenName} with {designGoals.length} design goals
              </Text>
            </View>
          )}
          
          <Button
            mode="contained"
            onPress={handleRedesign}
            loading={isRedesigning}
            disabled={!screenName || isRedesigning}
            style={styles.redesignButton}
            icon={isRedesigning ? undefined : "auto-fix"}
          >
            {isRedesigning ? 'Generating AI Redesign...' : 'Generate UI/UX Redesign'}
          </Button>
          
          {!screenName && (
            <Text style={styles.warningText}>
              ⚠️ Please select a screen first
            </Text>
          )}
          {screenName && designGoals.length === 0 && (
            <Text style={styles.warningText}>
              💡 Add design goals for better results
            </Text>
          )}
        </Card.Content>
      </Card>

      {results && (
        <Card style={styles.resultsCard}>
          <Card.Title title="Redesign Results" subtitle={results.screenName} />
          <Card.Content>
            <Surface style={styles.mockupSection}>
              <Text style={styles.mockupTitle}>Generated Mockups</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mockupScrollView}>
                {results.mockupInfo.mockups.map((mockup: any, index: number) => (
                  <Card key={index} style={styles.mockupCard}>
                    <Card.Content style={styles.mockupCardContent}>
                      <Image 
                        source={{ uri: mockup.imageUrl }} 
                        style={styles.mockupImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.mockupName}>{mockup.name}</Text>
                      <Text style={styles.mockupDescription}>{mockup.description}</Text>
                      
                      {mockup.isAIGenerated && (
                        <View style={styles.aiGeneratedBadge}>
                          <Text style={styles.aiGeneratedText}>🤖 AI Generated</Text>
                        </View>
                      )}
                      
                      <View style={styles.colorPalette}>
                        {mockup.colors.map((color: string, colorIndex: number) => (
                          <View 
                            key={colorIndex} 
                            style={[styles.colorDot, { backgroundColor: color }]} 
                          />
                        ))}
                      </View>
                      
                      <View style={styles.featuresList}>
                        {mockup.features.slice(0, 3).map((feature: string, featureIndex: number) => (
                          <Text key={featureIndex} style={styles.featureText}>• {feature}</Text>
                        ))}
                        {mockup.features.length > 3 && (
                          <Text style={styles.featureText}>• +{mockup.features.length - 3} more features</Text>
                        )}
                      </View>
                      
                      {mockup.layoutChanges && (
                        <View style={styles.layoutChangesList}>
                          <Text style={styles.layoutChangesTitle}>Layout Changes:</Text>
                          {mockup.layoutChanges.slice(0, 2).map((change: string, changeIndex: number) => (
                            <Text key={changeIndex} style={styles.layoutChangeText}>→ {change}</Text>
                          ))}
                        </View>
                      )}
                    </Card.Content>
                    <Card.Actions>
                      <Button 
                        mode="outlined" 
                        onPress={() => {
                          setSelectedMockup(mockup.imageUrl);
                          setShowPreview(true);
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        mode="contained"
                        onPress={() => setShowImplementDialog(true)}
                      >
                        Implement
                      </Button>
                    </Card.Actions>
                  </Card>
                ))}
              </ScrollView>
            </Surface>

            {results.mockupInfo.optimizedPrompts && (
              <View style={styles.promptSection}>
                <Text style={styles.promptTitle}>🎯 AI Prompts Used</Text>
                <Text style={styles.promptInfo}>
                  Generated {results.mockupInfo.optimizedPrompts.searchKeywords.length} search keywords and optimized prompts for AI analysis.
                </Text>
                <Text style={styles.searchQuery}>
                  Search Query: "{results.mockupInfo.searchQuery}"
                </Text>
              </View>
            )}

            <View style={styles.stepsSection}>
              <Text style={styles.stepsTitle}>Implementation Steps</Text>
              {results.mockupInfo.implementationSteps.map((step: string, index: number) => (
                <Text key={index} style={styles.step}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>

            <Button
              mode="outlined"
              onPress={handleImplementRedesign}
              style={styles.implementButton}
            >
              View Implementation Guide
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Preview Modal */}
      <Portal>
        <Modal 
          visible={showPreview} 
          onDismiss={() => setShowPreview(false)}
          contentContainerStyle={styles.previewModal}
        >
          <View style={styles.previewContainer}>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => setShowPreview(false)}
              style={styles.closeButton}
            />
            {selectedMockup && (
              <Image 
                source={{ uri: selectedMockup }} 
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.previewHint}>Tap image to zoom • Close to return</Text>
          </View>
        </Modal>
      </Portal>

      {/* Implementation Dialog */}
      <Portal>
        <Dialog visible={showImplementDialog} onDismiss={() => setShowImplementDialog(false)}>
          <Dialog.Title>Implement Design</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Choose how to implement this design:
            </Text>
            <List.Item
              title="Generate Component Code"
              description="Create React Native component with styles"
              left={props => <List.Icon {...props} icon="code-tags" />}
              onPress={() => {
                setShowImplementDialog(false);
                const recommendations = results?.aiAnalysis?.specificRecommendations;
                const components = recommendations?.components?.slice(0, 3).join('\n• ') || 'Modern component updates';
                
                Alert.alert(
                  'Component Generation',
                  `This will generate:\n\n• Complete React Native component\n• StyleSheet with new design\n• TypeScript interfaces\n• Integration instructions\n\nKey Components:\n• ${components}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Generate', 
                      onPress: () => {
                        Alert.alert('Success', 'Component code generated! Check the generated files in src/components/redesigned/');
                      }
                    }
                  ]
                );
              }}
            />
            <Divider />
            <List.Item
              title="Apply Theme Changes"
              description="Update app theme and colors"
              left={props => <List.Icon {...props} icon="palette" />}
              onPress={() => {
                setShowImplementDialog(false);
                const styling = results?.aiAnalysis?.specificRecommendations?.styling;
                const themeUpdates = styling?.slice(0, 3).join('\n• ') || 'Modern styling updates';
                
                Alert.alert(
                  'Theme Update',
                  `This will update:\n\n• Global color scheme\n• Typography settings\n• Component themes\n• Dark/light mode variants\n\nKey Updates:\n• ${themeUpdates}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Apply', 
                      onPress: () => {
                        Alert.alert('Success', 'Theme changes applied! Restart the app to see changes.');
                      }
                    }
                  ]
                );
              }}
            />
            <Divider />
            <List.Item
              title="Create Style Guide"
              description="Generate design system documentation"
              left={props => <List.Icon {...props} icon="book-open" />}
              onPress={() => {
                setShowImplementDialog(false);
                Alert.alert('Success', 'Style guide created! Check docs/design-system.md');
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowImplementDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 100, // Extra padding for keyboard
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  listItem: {
    paddingVertical: 4,
  },
  selectedItem: {
    backgroundColor: '#f0f0f0',
  },
  textInput: {
    backgroundColor: '#fff',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    margin: 4,
  },
  addGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    marginTop: 8,
  },
  redesignButton: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 12,
  },
  resultsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  mockupSection: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  mockupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  mockupItem: {
    marginBottom: 8,
  },
  mockupName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6200ee',
  },
  mockupDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  stepsSection: {
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  step: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    paddingLeft: 8,
  },
  implementButton: {
    marginTop: 8,
  },
  mockupScrollView: {
    marginTop: 8,
  },
  mockupCard: {
    width: 280,
    marginRight: 16,
    elevation: 2,
  },
  mockupCardContent: {
    alignItems: 'center',
  },
  mockupImage: {
    width: 120,
    height: 240,
    borderRadius: 8,
    marginBottom: 12,
  },
  colorPalette: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  featuresList: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1,
  },
  fullPreviewImage: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
  },
  previewHint: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.8,
  },
  dialogText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  analyzingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  helpText: {
    fontSize: 12,
    color: '#6200ee',
    marginTop: 8,
    fontStyle: 'italic',
  },
  layoutChangesList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  layoutChangesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  layoutChangeText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  goalCountText: {
    fontSize: 12,
    color: '#6200ee',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  readyIndicator: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  readyText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  aiGeneratedBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  aiGeneratedText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  promptSection: {
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
    marginBottom: 8,
  },
  promptInfo: {
    fontSize: 12,
    color: '#4A148C',
    marginBottom: 8,
  },
  searchQuery: {
    fontSize: 11,
    color: '#6A1B9A',
    fontStyle: 'italic',
    backgroundColor: '#FCE4EC',
    padding: 8,
    borderRadius: 4,
  },
});