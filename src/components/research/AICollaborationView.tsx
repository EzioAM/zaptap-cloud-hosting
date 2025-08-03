import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Avatar,
  Divider,
  ActivityIndicator,
  IconButton,
  Surface,
} from 'react-native-paper';

interface AIResponse {
  provider: 'claude' | 'chatgpt';
  content: string;
  insights: string[];
  recommendations: string[];
  codeExamples?: string[];
  timestamp: number;
}

interface CollaborationRound {
  round: number;
  question: string;
  claudeResponse?: AIResponse;
  chatgptResponse?: AIResponse;
  synthesis: string[];
}

interface AICollaborationViewProps {
  rounds: CollaborationRound[];
  isLoading?: boolean;
  currentRound?: number;
  collaborationSummary?: string;
}

export const AICollaborationView: React.FC<AICollaborationViewProps> = ({
  rounds,
  isLoading = false,
  currentRound = 0,
  collaborationSummary
}) => {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentRound]);

  const getAIAvatar = (provider: 'claude' | 'chatgpt') => {
    return provider === 'claude' 
      ? { icon: 'robot', color: '#FF6B35' } 
      : { icon: 'brain', color: '#00A67E' };
  };

  const renderAIResponse = (response: AIResponse, isLeft: boolean) => {
    const avatar = getAIAvatar(response.provider);
    
    return (
      <Animated.View 
        style={[
          styles.responseContainer,
          isLeft ? styles.leftResponse : styles.rightResponse,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.avatarContainer}>
          <Avatar.Icon 
            size={36} 
            icon={avatar.icon} 
            style={{ backgroundColor: avatar.color }}
          />
          <Text style={styles.aiName}>
            {response.provider === 'claude' ? 'Claude' : 'ChatGPT'}
          </Text>
        </View>
        
        <Card style={[styles.responseCard, { borderColor: avatar.color }]}>
          <Card.Content>
            {response.insights.length > 0 && (
              <>
                <Text style={styles.responseLabel}>Key Insights:</Text>
                {response.insights.slice(0, 2).map((insight, idx) => (
                  <Text key={idx} style={styles.bulletPoint}>• {insight}</Text>
                ))}
              </>
            )}
            
            {response.recommendations.length > 0 && (
              <>
                <Text style={[styles.responseLabel, { marginTop: 8 }]}>
                  Recommendations:
                </Text>
                {response.recommendations.slice(0, 2).map((rec, idx) => (
                  <Text key={idx} style={styles.bulletPoint}>• {rec}</Text>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const renderRound = (round: CollaborationRound, index: number) => {
    const isExpanded = expandedRound === index;
    const isCurrentRound = index === currentRound - 1;
    
    return (
      <View key={round.round} style={styles.roundContainer}>
        {/* Round Header */}
        <Surface style={[styles.roundHeader, isCurrentRound && styles.activeRoundHeader]}>
          <View style={styles.roundTitleContainer}>
            <Chip 
              mode="flat" 
              style={[styles.roundChip, isCurrentRound && styles.activeRoundChip]}
            >
              Round {round.round}
            </Chip>
            <Text style={styles.roundQuestion} numberOfLines={2}>
              {round.question}
            </Text>
          </View>
          <IconButton
            icon={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            onPress={() => setExpandedRound(isExpanded ? null : index)}
          />
        </Surface>

        {/* Round Content */}
        {(isExpanded || isCurrentRound) && (
          <View style={styles.roundContent}>
            {/* AI Responses */}
            <View style={styles.responsesContainer}>
              {round.claudeResponse && renderAIResponse(round.claudeResponse, true)}
              
              {round.claudeResponse && round.chatgptResponse && (
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowText}>↔</Text>
                  <Text style={styles.bouncingText}>Bouncing Ideas</Text>
                </View>
              )}
              
              {round.chatgptResponse && renderAIResponse(round.chatgptResponse, false)}
            </View>

            {/* Synthesis */}
            {round.synthesis.length > 0 && (
              <Card style={styles.synthesisCard}>
                <Card.Content>
                  <Text style={styles.synthesisTitle}>💡 Synthesis</Text>
                  {round.synthesis.map((point, idx) => (
                    <Text key={idx} style={styles.synthesisPoint}>{point}</Text>
                  ))}
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Loading indicator for current round */}
        {isCurrentRound && isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>AIs are collaborating...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Collaboration Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.aiLogos}>
              <Avatar.Icon 
                size={32} 
                icon="robot" 
                style={{ backgroundColor: '#FF6B35' }}
              />
              <Text style={styles.collaborationIcon}>🤝</Text>
              <Avatar.Icon 
                size={32} 
                icon="brain" 
                style={{ backgroundColor: '#00A67E' }}
              />
            </View>
            <Text style={styles.headerTitle}>AI Collaboration in Progress</Text>
            <Text style={styles.headerSubtitle}>
              Claude and ChatGPT are bouncing ideas off each other
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Rounds */}
      {rounds.map((round, index) => renderRound(round, index))}

      {/* Summary */}
      {collaborationSummary && !isLoading && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>📊 Collaboration Summary</Text>
            <Text style={styles.summaryText}>{collaborationSummary}</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  aiLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  collaborationIcon: {
    fontSize: 24,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  roundContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  roundHeader: {
    padding: 12,
    borderRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeRoundHeader: {
    backgroundColor: '#E3F2FD',
  },
  roundTitleContainer: {
    flex: 1,
  },
  roundChip: {
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  activeRoundChip: {
    backgroundColor: '#2196F3',
  },
  roundQuestion: {
    fontSize: 14,
    color: '#444',
    marginRight: 8,
  },
  roundContent: {
    marginTop: 12,
  },
  responsesContainer: {
    marginBottom: 12,
  },
  responseContainer: {
    marginBottom: 12,
  },
  leftResponse: {
    alignItems: 'flex-start',
  },
  rightResponse: {
    alignItems: 'flex-end',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  aiName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  responseCard: {
    maxWidth: '85%',
    borderWidth: 1,
  },
  responseLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  bulletPoint: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
    paddingLeft: 8,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#666',
  },
  bouncingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  synthesisCard: {
    backgroundColor: '#F5F5F5',
    marginTop: 8,
  },
  synthesisTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  synthesisPoint: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  summaryCard: {
    margin: 16,
    backgroundColor: '#E8F5E9',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
});