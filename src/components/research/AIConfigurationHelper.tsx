import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Chip,
  Divider,
} from 'react-native-paper';

interface AIConfigurationHelperProps {
  hasClaudeKey: boolean;
  hasOpenAIKey: boolean;
  onDismiss?: () => void;
}

export const AIConfigurationHelper: React.FC<AIConfigurationHelperProps> = ({
  hasClaudeKey,
  hasOpenAIKey,
  onDismiss
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleOpenDocs = (url: string) => {
    Linking.openURL(url);
  };

  const getConfigStatus = () => {
    if (hasClaudeKey && hasOpenAIKey) {
      return {
        title: '✅ AI Services Configured',
        message: 'Both Claude and ChatGPT are ready for collaborative research!',
        color: '#4CAF50'
      };
    } else if (hasClaudeKey || hasOpenAIKey) {
      return {
        title: '⚠️ Partial Configuration',
        message: 'One AI service is configured. Add the other for full collaboration.',
        color: '#FF9800'
      };
    } else {
      return {
        title: '🔧 Configuration Needed',
        message: 'Configure API keys to enable AI collaboration features.',
        color: '#2196F3'
      };
    }
  };

  const status = getConfigStatus();

  return (
    <Card style={styles.container}>
      <Card.Title 
        title={status.title}
        titleStyle={{ color: status.color }}
      />
      <Card.Content>
        <Text style={styles.message}>{status.message}</Text>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Chip 
              mode="flat" 
              style={[styles.statusChip, hasClaudeKey && styles.activeChip]}
              icon={hasClaudeKey ? "check" : "close"}
            >
              Claude API
            </Chip>
          </View>
          <View style={styles.statusItem}>
            <Chip 
              mode="flat" 
              style={[styles.statusChip, hasOpenAIKey && styles.activeChip]}
              icon={hasOpenAIKey ? "check" : "close"}
            >
              ChatGPT API
            </Chip>
          </View>
        </View>

        {(!hasClaudeKey || !hasOpenAIKey) && (
          <>
            <Divider style={styles.divider} />
            
            {!showInstructions ? (
              <Button
                mode="outlined"
                onPress={() => setShowInstructions(true)}
                style={styles.button}
              >
                Show Setup Instructions
              </Button>
            ) : (
              <View>
                <Text style={styles.instructionsTitle}>
                  To enable AI collaboration:
                </Text>
                
                <List.Section>
                  <List.Item
                    title="1. Get API Keys"
                    description="Sign up for Claude and/or OpenAI accounts"
                    left={(props) => <List.Icon {...props} icon="key" />}
                  />
                  
                  {!hasClaudeKey && (
                    <Button
                      mode="text"
                      onPress={() => handleOpenDocs('https://console.anthropic.com/')}
                      style={styles.linkButton}
                    >
                      Get Claude API Key →
                    </Button>
                  )}
                  
                  {!hasOpenAIKey && (
                    <Button
                      mode="text"
                      onPress={() => handleOpenDocs('https://platform.openai.com/api-keys')}
                      style={styles.linkButton}
                    >
                      Get OpenAI API Key →
                    </Button>
                  )}
                  
                  <List.Item
                    title="2. Add to EAS Secrets"
                    description="Set CLAUDE_API_KEY and OPENAI_API_KEY in your EAS project"
                    left={(props) => <List.Icon {...props} icon="cloud-upload" />}
                  />
                  
                  <Text style={styles.codeBlock}>
                    eas secret:create CLAUDE_API_KEY{'\n'}
                    eas secret:create OPENAI_API_KEY
                  </Text>
                  
                  <List.Item
                    title="3. Rebuild & Deploy"
                    description="Create a new build to include the API keys"
                    left={(props) => <List.Icon {...props} icon="rocket" />}
                  />
                  
                  <Text style={styles.codeBlock}>
                    eas build --platform all --profile preview
                  </Text>
                </List.Section>
                
                <Text style={styles.note}>
                  💡 Note: API keys are securely stored and never exposed in your code
                </Text>
              </View>
            )}
          </>
        )}

        {hasClaudeKey && hasOpenAIKey && (
          <View style={styles.readyContainer}>
            <Text style={styles.readyText}>
              🎉 You're all set! The AIs will collaborate to provide better insights.
            </Text>
            <Text style={styles.benefitText}>
              Benefits of AI collaboration:
            </Text>
            <Text style={styles.benefitItem}>• Multiple perspectives on solutions</Text>
            <Text style={styles.benefitItem}>• AIs build on each other's ideas</Text>
            <Text style={styles.benefitItem}>• More comprehensive recommendations</Text>
            <Text style={styles.benefitItem}>• Higher quality code examples</Text>
          </View>
        )}
      </Card.Content>
      
      {onDismiss && (
        <Card.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: '#F5F5F5',
  },
  activeChip: {
    backgroundColor: '#E8F5E9',
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  linkButton: {
    marginLeft: 40,
    marginBottom: 8,
  },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
  },
  readyContainer: {
    marginTop: 8,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    paddingLeft: 8,
  },
});