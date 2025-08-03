import axios from 'axios';
import Constants from 'expo-constants';
import { LocalResearchService, ResearchTopic } from './LocalResearchService';

interface ResearchQuery {
  topic: string;
  context?: string;
  specificQuestions?: string[];
  focusAreas?: string[];
  outputFormat?: 'structured' | 'narrative';
}

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

interface CollaborativeResult {
  topic: string;
  rounds: CollaborationRound[];
  finalInsights: string[];
  finalRecommendations: string[];
  codeExamples: string[];
  collaborationSummary: string;
  confidence: number;
}

export class CollaborativeAIResearchService {
  private claudeApiKey: string | null;
  private openaiApiKey: string | null;
  private maxRounds = 3;

  constructor() {
    // Get API keys from environment
    this.claudeApiKey = this.getApiKey('claudeApiKey', 'CLAUDE_API_KEY');
    this.openaiApiKey = this.getApiKey('openaiApiKey', 'OPENAI_API_KEY');
    
    console.log('🤝 Collaborative AI Service initialized:', {
      hasClaudeKey: !!this.claudeApiKey,
      hasOpenAIKey: !!this.openaiApiKey,
      canCollaborate: !!(this.claudeApiKey && this.openaiApiKey)
    });
  }

  private getApiKey(configKey: string, envKey: string): string | null {
    return Constants.expoConfig?.extra?.[configKey] ||
           Constants.manifest?.extra?.[configKey] ||
           Constants.manifest2?.extra?.expoClient?.extra?.[configKey] ||
           null;
  }

  /**
   * Main collaborative research method where AIs bounce ideas off each other
   */
  async collaborativeResearch(query: ResearchQuery): Promise<CollaborativeResult> {
    console.log('🧠 Starting collaborative AI research for:', query.topic);
    
    const rounds: CollaborationRound[] = [];
    const collaborativeResult: CollaborativeResult = {
      topic: query.topic,
      rounds: [],
      finalInsights: [],
      finalRecommendations: [],
      codeExamples: [],
      collaborationSummary: '',
      confidence: 0
    };

    try {
      // Round 1: Initial exploration
      const round1 = await this.conductRound(1, 
        `Research ${query.topic} for a React Native mobile automation app. ${query.context || ''} 
         Focus on: ${query.focusAreas?.join(', ') || 'best practices, implementation, and optimization'}`,
        null
      );
      rounds.push(round1);

      // Round 2: Build on each other's ideas
      if (round1.claudeResponse && round1.chatgptResponse) {
        const round2Question = this.generateRound2Question(round1, query);
        const round2 = await this.conductRound(2, round2Question, round1);
        rounds.push(round2);

        // Round 3: Synthesize and refine
        if (round2.claudeResponse && round2.chatgptResponse) {
          const round3Question = this.generateRound3Question(round2, query);
          const round3 = await this.conductRound(3, round3Question, round2);
          rounds.push(round3);
        }
      }

      // Synthesize all rounds into final results
      collaborativeResult.rounds = rounds;
      collaborativeResult.finalInsights = this.synthesizeInsights(rounds);
      collaborativeResult.finalRecommendations = this.synthesizeRecommendations(rounds);
      collaborativeResult.codeExamples = this.extractCodeExamples(rounds);
      collaborativeResult.collaborationSummary = this.generateCollaborationSummary(rounds);
      collaborativeResult.confidence = this.calculateConfidence(rounds);

    } catch (error) {
      console.error('Collaborative research error:', error);
      // Fallback to enhanced local research if collaboration fails
      return this.getFallbackCollaborativeResult(query);
    }

    return collaborativeResult;
  }

  /**
   * Conduct a single round of AI collaboration
   */
  private async conductRound(
    roundNumber: number, 
    question: string, 
    previousRound: CollaborationRound | null
  ): Promise<CollaborationRound> {
    console.log(`🔄 Round ${roundNumber}: ${question.substring(0, 100)}...`);
    
    const round: CollaborationRound = {
      round: roundNumber,
      question,
      synthesis: []
    };

    // Get Claude's perspective
    if (this.claudeApiKey) {
      try {
        const claudePrompt = previousRound 
          ? `${question}\n\nBuilding on the previous discussion where ChatGPT said: "${this.summarizeResponse(previousRound.chatgptResponse)}"`
          : question;
        
        round.claudeResponse = await this.queryClaudeAPI(claudePrompt);
      } catch (error) {
        console.error('Claude API error in round', roundNumber, error);
      }
    }

    // Get ChatGPT's perspective
    if (this.openaiApiKey) {
      try {
        const chatgptPrompt = previousRound && round.claudeResponse
          ? `${question}\n\nClaude just suggested: "${this.summarizeResponse(round.claudeResponse)}". Build upon or respectfully challenge these ideas.`
          : question;
        
        round.chatgptResponse = await this.queryChatGPTAPI(chatgptPrompt);
      } catch (error) {
        console.error('ChatGPT API error in round', roundNumber, error);
      }
    }

    // Synthesize the round
    round.synthesis = this.synthesizeRound(round);
    
    return round;
  }

  /**
   * Query Claude API
   */
  private async queryClaudeAPI(prompt: string): Promise<AIResponse> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.content[0].text;
    return {
      provider: 'claude',
      content,
      insights: this.extractInsights(content),
      recommendations: this.extractRecommendations(content),
      codeExamples: this.extractCodeExamples(content),
      timestamp: Date.now()
    };
  }

  /**
   * Query ChatGPT API
   */
  private async queryChatGPTAPI(prompt: string): Promise<AIResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return {
      provider: 'chatgpt',
      content,
      insights: this.extractInsights(content),
      recommendations: this.extractRecommendations(content),
      codeExamples: this.extractCodeExamples(content),
      timestamp: Date.now()
    };
  }

  /**
   * Generate question for round 2 based on round 1 responses
   */
  private generateRound2Question(round1: CollaborationRound, query: ResearchQuery): string {
    const claudeInsights = round1.claudeResponse?.insights.slice(0, 2).join('; ') || '';
    const chatgptInsights = round1.chatgptResponse?.insights.slice(0, 2).join('; ') || '';
    
    return `Based on our initial research on ${query.topic}:
    
Claude highlighted: ${claudeInsights}
ChatGPT emphasized: ${chatgptInsights}

Let's dive deeper into the practical implementation. What are the specific code patterns, 
potential pitfalls, and optimization strategies for implementing this in a React Native app? 
Please provide concrete examples and address any points of disagreement.`;
  }

  /**
   * Generate question for round 3 based on round 2 responses
   */
  private generateRound3Question(round2: CollaborationRound, query: ResearchQuery): string {
    return `Let's synthesize our discussion on ${query.topic}:

1. What are the top 3-5 most important insights for developers?
2. What's the recommended implementation approach considering both perspectives?
3. What code example best demonstrates the optimal solution?
4. What are the key trade-offs developers should consider?

Please provide a final, actionable summary.`;
  }

  /**
   * Extract insights from AI response
   */
  private extractInsights(content: string): string[] {
    const insights: string[] = [];
    
    // Look for bullet points, numbered lists, or key phrases
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.match(/^[-•*]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/)) {
        const insight = line.replace(/^[-•*\d.]\s+/, '').trim();
        if (insight.length > 20 && insight.length < 200) {
          insights.push(insight);
        }
      }
    });

    // Also extract from sections
    const insightSection = content.match(/insights?:?\s*\n([\s\S]*?)(?:\n\n|$)/i);
    if (insightSection) {
      const sectionInsights = insightSection[1].split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-•*\d.]\s+/, '').trim());
      insights.push(...sectionInsights);
    }

    return [...new Set(insights)].slice(0, 10);
  }

  /**
   * Extract recommendations from AI response
   */
  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    
    // Look for recommendation patterns
    const patterns = [
      /recommend[ation]?:?\s*(.+)/gi,
      /suggest[ion]?:?\s*(.+)/gi,
      /should\s+(.+)/gi,
      /best practice[s]?:?\s*(.+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 20 && match[1].length < 200) {
          recommendations.push(match[1].trim());
        }
      }
    });

    return [...new Set(recommendations)].slice(0, 10);
  }

  /**
   * Extract code examples from AI response
   */
  private extractCodeExamples(content: string): string[] {
    const codeExamples: string[] = [];
    
    // Extract code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = content.matchAll(codeBlockRegex);
    
    for (const match of matches) {
      if (match[1]) {
        codeExamples.push(match[1].trim());
      }
    }

    return codeExamples.slice(0, 5);
  }

  /**
   * Summarize an AI response for context
   */
  private summarizeResponse(response?: AIResponse): string {
    if (!response) return 'no previous response';
    
    const topInsights = response.insights.slice(0, 2).join('; ');
    const topRecs = response.recommendations.slice(0, 2).join('; ');
    
    return `Insights: ${topInsights || 'none'}. Recommendations: ${topRecs || 'none'}.`;
  }

  /**
   * Synthesize insights from a single round
   */
  private synthesizeRound(round: CollaborationRound): string[] {
    const synthesis: string[] = [];
    
    if (round.claudeResponse && round.chatgptResponse) {
      // Find agreements
      const claudeInsights = new Set(round.claudeResponse.insights);
      const commonInsights = round.chatgptResponse.insights.filter(i => 
        Array.from(claudeInsights).some(ci => 
          ci.toLowerCase().includes(i.toLowerCase().substring(0, 20)) ||
          i.toLowerCase().includes(ci.toLowerCase().substring(0, 20))
        )
      );
      
      if (commonInsights.length > 0) {
        synthesis.push(`Both AIs agree: ${commonInsights[0]}`);
      }
      
      // Find unique perspectives
      const uniqueClaude = round.claudeResponse.insights.find(i => 
        !round.chatgptResponse!.insights.some(gi => 
          gi.toLowerCase().includes(i.toLowerCase().substring(0, 20))
        )
      );
      
      if (uniqueClaude) {
        synthesis.push(`Claude's unique insight: ${uniqueClaude}`);
      }
      
      const uniqueChatGPT = round.chatgptResponse.insights.find(i => 
        !round.claudeResponse!.insights.some(ci => 
          ci.toLowerCase().includes(i.toLowerCase().substring(0, 20))
        )
      );
      
      if (uniqueChatGPT) {
        synthesis.push(`ChatGPT's unique insight: ${uniqueChatGPT}`);
      }
    }
    
    return synthesis;
  }

  /**
   * Synthesize all insights from all rounds
   */
  private synthesizeInsights(rounds: CollaborationRound[]): string[] {
    const allInsights: string[] = [];
    
    rounds.forEach(round => {
      if (round.claudeResponse) {
        allInsights.push(...round.claudeResponse.insights);
      }
      if (round.chatgptResponse) {
        allInsights.push(...round.chatgptResponse.insights);
      }
      allInsights.push(...round.synthesis);
    });

    // Deduplicate and prioritize
    const uniqueInsights = [...new Set(allInsights)];
    
    // Sort by frequency (insights that appear in multiple rounds)
    const insightFrequency = new Map<string, number>();
    allInsights.forEach(insight => {
      insightFrequency.set(insight, (insightFrequency.get(insight) || 0) + 1);
    });
    
    return uniqueInsights
      .sort((a, b) => (insightFrequency.get(b) || 0) - (insightFrequency.get(a) || 0))
      .slice(0, 10);
  }

  /**
   * Synthesize all recommendations from all rounds
   */
  private synthesizeRecommendations(rounds: CollaborationRound[]): string[] {
    const allRecommendations: string[] = [];
    
    rounds.forEach(round => {
      if (round.claudeResponse) {
        allRecommendations.push(...round.claudeResponse.recommendations);
      }
      if (round.chatgptResponse) {
        allRecommendations.push(...round.chatgptResponse.recommendations);
      }
    });

    return [...new Set(allRecommendations)].slice(0, 12);
  }

  /**
   * Extract all code examples from rounds
   */
  private extractCodeExamples(rounds: CollaborationRound[]): string[] {
    const allCodeExamples: string[] = [];
    
    rounds.forEach(round => {
      if (round.claudeResponse?.codeExamples) {
        allCodeExamples.push(...round.claudeResponse.codeExamples);
      }
      if (round.chatgptResponse?.codeExamples) {
        allCodeExamples.push(...round.chatgptResponse.codeExamples);
      }
    });

    return [...new Set(allCodeExamples)].slice(0, 5);
  }

  /**
   * Generate a summary of the collaboration
   */
  private generateCollaborationSummary(rounds: CollaborationRound[]): string {
    const totalResponses = rounds.reduce((sum, round) => 
      sum + (round.claudeResponse ? 1 : 0) + (round.chatgptResponse ? 1 : 0), 0
    );
    
    const agreements = rounds.flatMap(r => r.synthesis.filter(s => s.includes('agree')));
    const uniqueInsights = rounds.flatMap(r => r.synthesis.filter(s => s.includes('unique')));
    
    return `Conducted ${rounds.length} rounds of AI collaboration with ${totalResponses} total responses. 
            Found ${agreements.length} points of agreement and ${uniqueInsights.length} unique perspectives. 
            The AIs built upon each other's ideas to provide comprehensive insights.`;
  }

  /**
   * Calculate confidence score based on collaboration quality
   */
  private calculateConfidence(rounds: CollaborationRound[]): number {
    let score = 0.5; // Base score
    
    // Add points for successful rounds
    rounds.forEach(round => {
      if (round.claudeResponse) score += 0.1;
      if (round.chatgptResponse) score += 0.1;
      if (round.synthesis.length > 0) score += 0.05;
    });
    
    // Bonus for multi-round collaboration
    if (rounds.length >= 3) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate fallback collaborative result using enhanced local data
   */
  private getFallbackCollaborativeResult(query: ResearchQuery): CollaborativeResult {
    const localTopic = LocalResearchService.getResearch(query.topic);
    
    return {
      topic: query.topic,
      rounds: [{
        round: 1,
        question: query.topic,
        synthesis: ['Using enhanced local research data due to API unavailability']
      }],
      finalInsights: localTopic?.insights || [
        `Consider implementing ${query.topic} using React Native best practices`,
        'Ensure cross-platform compatibility',
        'Focus on performance optimization',
        'Implement proper error handling'
      ],
      finalRecommendations: localTopic?.recommendations || [
        'Research similar implementations in the React Native community',
        'Start with a proof of concept',
        'Test thoroughly on both platforms',
        'Consider using established libraries'
      ],
      codeExamples: localTopic?.codeExamples || [],
      collaborationSummary: 'Using curated local knowledge base. Enable API keys for collaborative AI research.',
      confidence: 0.7
    };
  }

  /**
   * Convert collaborative result to ResearchTopic format
   */
  toResearchTopic(result: CollaborativeResult): ResearchTopic {
    return {
      topic: result.topic,
      insights: result.finalInsights,
      recommendations: result.finalRecommendations,
      codeExamples: result.codeExamples,
      sources: ['Claude AI', 'ChatGPT', 'Collaborative Synthesis'],
      lastUpdated: new Date().toISOString()
    };
  }
}