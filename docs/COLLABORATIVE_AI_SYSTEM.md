# Collaborative AI System Documentation

## Overview

The Collaborative AI System enables ChatGPT and Claude to "bounce ideas off each other" through multi-round conversations, providing more comprehensive research insights for the Shortcuts Like v2 application.

## Key Features

### 1. Multi-Round AI Collaboration
- **3 rounds of conversation** where AIs build on each other's responses
- Each round has a specific focus:
  - Round 1: Initial exploration and insights
  - Round 2: Deeper dive into practical implementation
  - Round 3: Synthesis and actionable recommendations

### 2. Visual Collaboration Feedback
- **AICollaborationView component** shows real-time progress
- Displays each AI's responses side-by-side
- Shows synthesis of agreements and unique perspectives
- Animated transitions between rounds

### 3. API Configuration Helper
- **AIConfigurationHelper component** guides users through setup
- Shows current configuration status
- Provides step-by-step instructions for adding API keys
- Links to API key generation pages

## Architecture

### Core Services

#### CollaborativeAIResearchService
```typescript
class CollaborativeAIResearchService {
  // Main method for collaborative research
  async collaborativeResearch(query: ResearchQuery): Promise<CollaborativeResult>
  
  // Conduct a single round of collaboration
  private async conductRound(roundNumber, question, previousRound): Promise<CollaborationRound>
  
  // Query individual AI services
  private async queryClaudeAPI(prompt: string): Promise<AIResponse>
  private async queryChatGPTAPI(prompt: string): Promise<AIResponse>
}
```

#### Key Data Structures
```typescript
interface CollaborationRound {
  round: number;
  question: string;
  claudeResponse?: AIResponse;
  chatgptResponse?: AIResponse;
  synthesis: string[];
}

interface CollaborativeResult {
  topic: string;
  rounds: CollaborationRound[];
  finalInsights: string[];
  finalRecommendations: string[];
  codeExamples: string[];
  collaborationSummary: string;
  confidence: number;
}
```

### UI Components

#### ResearchDashboardEnhanced Updates
- Toggle between simple and collaborative AI modes
- Automatic API configuration checking
- Integration with AIConfigurationHelper
- Real-time collaboration visualization

#### AICollaborationView
- Shows AI avatars and conversation flow
- Expandable rounds with detailed responses
- Visual "bouncing ideas" indicator
- Synthesis highlights for each round

#### AIConfigurationHelper
- Configuration status display
- Step-by-step setup instructions
- Direct links to API key generation
- EAS secret management commands

## Usage Flow

1. **User enables collaborative mode** via toggle button
2. **System checks API configuration**
   - If keys missing, shows configuration helper
   - If configured, proceeds with research
3. **Collaborative research begins**
   - Round 1: Initial topic exploration
   - Round 2: AIs build on each other's ideas
   - Round 3: Final synthesis and recommendations
4. **Results displayed** with visual collaboration history
5. **User can implement** recommendations directly

## API Configuration

### Required Environment Variables
```bash
# Add to EAS secrets
eas secret:create CLAUDE_API_KEY
eas secret:create OPENAI_API_KEY
```

### Fallback Behavior
- If both APIs unavailable: Enhanced local research
- If one API available: Single AI research with fallback
- Clear user messaging about configuration status

## Benefits of AI Collaboration

1. **Multiple Perspectives**: Each AI brings unique strengths
2. **Idea Building**: Later rounds incorporate earlier insights
3. **Disagreement Handling**: Different viewpoints are synthesized
4. **Comprehensive Coverage**: More thorough exploration of topics
5. **Higher Confidence**: Cross-validation of recommendations

## Implementation Details

### Round Questions Strategy
- Round 1: Open-ended exploration
- Round 2: References previous insights, asks for deeper implementation details
- Round 3: Requests synthesis and actionable summary

### Response Processing
- Extracts insights using pattern matching
- Identifies recommendations from key phrases
- Captures code examples from markdown blocks
- Synthesizes agreements and unique perspectives

### Error Handling
- Graceful fallback to single AI or local research
- User-friendly error messages
- Configuration guidance when APIs fail

## Testing the System

1. **Without API Keys**: 
   - System shows configuration helper
   - Falls back to enhanced local research
   
2. **With One API Key**:
   - Uses available AI service
   - Shows partial configuration status
   
3. **With Both API Keys**:
   - Full collaborative research
   - 3 rounds of AI conversation
   - Complete synthesis and recommendations

## Future Enhancements

1. **More AI Providers**: Add support for other AI services
2. **Custom Round Count**: Allow users to configure collaboration depth
3. **Topic Memory**: Remember previous collaborations
4. **Export Functionality**: Save collaboration sessions
5. **Real-time Streaming**: Show responses as they arrive

## Troubleshooting

### Common Issues

1. **"API Configuration Required" Alert**
   - Solution: Add API keys via EAS secrets
   - Use the Config button to see instructions

2. **Collaboration Falls Back to Simple Research**
   - Check API key configuration
   - Verify network connectivity
   - Check API rate limits

3. **Slow Response Times**
   - Normal for multi-round collaboration
   - Each round makes 2 API calls
   - Consider using simple mode for quick queries

### Debug Information
- Check console logs for detailed API status
- Look for 🤝 emoji for collaboration events
- Configuration status logged on component mount