#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class ResearchAnalyzer {
  constructor() {
    this.analysisResults = {
      consensus: [],
      claudeUnique: [],
      chatgptUnique: [],
      priorities: [],
      implementationPlan: [],
      complexityAnalysis: {},
      recommendations: []
    };
  }

  analyzeResearchFile(filePath) {
    console.log('🔍 Analyzing research results...');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Research file not found:', filePath);
      process.exit(1);
    }

    const researchData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`📊 Analyzing: ${researchData.topic}`);

    // Extract insights from both AIs
    const claudeInsights = this.extractInsights(researchData.claude || '');
    const chatgptInsights = this.extractInsights(researchData.chatgpt || '');

    // Find consensus and unique insights
    this.findConsensus(claudeInsights, chatgptInsights);
    
    // Analyze implementation complexity
    this.analyzeComplexity(claudeInsights, chatgptInsights);
    
    // Generate priority rankings
    this.generatePriorities();
    
    // Create implementation roadmap
    this.createImplementationPlan();

    // Save analysis results
    this.saveAnalysis(filePath, researchData.topic);

    console.log('✅ Analysis complete!');
    this.printSummary();
  }

  extractInsights(text) {
    if (!text || typeof text !== 'string') return [];
    
    const insights = [];
    
    // Extract numbered points, bullet points, and recommendations
    const patterns = [
      /\d+\.\s*([^\\n]+)/g,  // Numbered lists
      /[-*]\s*([^\\n]+)/g,   // Bullet points
      /Recommendation:?\s*([^\\n]+)/gi,
      /Suggestion:?\s*([^\\n]+)/gi,
      /Implement:?\s*([^\\n]+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const insight = match[1].trim();
        if (insight.length > 10) { // Filter out very short insights
          insights.push(insight);
        }
      }
    });

    return [...new Set(insights)]; // Remove duplicates
  }

  findConsensus(claudeInsights, chatgptInsights) {
    console.log('🤝 Finding consensus between Claude and ChatGPT...');
    
    const claudeWords = this.extractKeywords(claudeInsights);
    const chatgptWords = this.extractKeywords(chatgptInsights);
    
    // Find common themes
    const commonWords = claudeWords.filter(word => chatgptWords.includes(word));
    
    claudeInsights.forEach(insight => {
      const hasConsensus = chatgptInsights.some(otherInsight => 
        this.calculateSimilarity(insight, otherInsight) > 0.3
      );
      
      if (hasConsensus) {
        this.analysisResults.consensus.push(insight);
      } else {
        this.analysisResults.claudeUnique.push(insight);
      }
    });

    chatgptInsights.forEach(insight => {
      const hasConsensus = claudeInsights.some(otherInsight => 
        this.calculateSimilarity(insight, otherInsight) > 0.3
      );
      
      if (!hasConsensus) {
        this.analysisResults.chatgptUnique.push(insight);
      }
    });
  }

  extractKeywords(insights) {
    const text = insights.join(' ').toLowerCase();
    const words = text.match(/\\b\\w{4,}\\b/g) || [];
    const commonWords = ['with', 'that', 'this', 'they', 'should', 'would', 'could', 'will', 'can', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'run', 'say', 'she', 'too', 'use'];
    return words.filter(word => !commonWords.includes(word));
  }

  calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(' ');
    const words2 = str2.toLowerCase().split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  analyzeComplexity(claudeInsights, chatgptInsights) {
    console.log('⚖️ Analyzing implementation complexity...');
    
    const allInsights = [...claudeInsights, ...chatgptInsights];
    const complexityKeywords = {
      low: ['simple', 'easy', 'basic', 'quick', 'straightforward', 'add', 'update'],
      medium: ['implement', 'create', 'build', 'develop', 'integrate', 'modify'],
      high: ['complex', 'advanced', 'sophisticated', 'architecture', 'refactor', 'redesign', 'scalable']
    };

    allInsights.forEach(insight => {
      let complexity = 'medium'; // default
      let score = 0;
      
      Object.entries(complexityKeywords).forEach(([level, keywords]) => {
        const matches = keywords.filter(keyword => 
          insight.toLowerCase().includes(keyword)
        ).length;
        
        if (level === 'low' && matches > score) {
          complexity = 'low';
          score = matches;
        } else if (level === 'high' && matches > score) {
          complexity = 'high';
          score = matches;
        }
      });

      this.analysisResults.complexityAnalysis[insight] = complexity;
    });
  }

  generatePriorities() {
    console.log('📋 Generating priority rankings...');
    
    const allInsights = [
      ...this.analysisResults.consensus,
      ...this.analysisResults.claudeUnique,
      ...this.analysisResults.chatgptUnique
    ];

    const priorityKeywords = {
      high: ['critical', 'important', 'essential', 'urgent', 'security', 'performance', 'user experience'],
      medium: ['beneficial', 'helpful', 'useful', 'improve', 'enhance', 'optimize'],
      low: ['nice to have', 'optional', 'future', 'consider', 'explore']
    };

    allInsights.forEach(insight => {
      let priority = 'medium'; // default
      let isConsensus = this.analysisResults.consensus.includes(insight);
      
      // Consensus items get higher priority
      if (isConsensus) {
        priority = 'high';
      }

      // Check for priority keywords
      Object.entries(priorityKeywords).forEach(([level, keywords]) => {
        const hasKeyword = keywords.some(keyword => 
          insight.toLowerCase().includes(keyword)
        );
        if (hasKeyword && level === 'high') {
          priority = 'high';
        } else if (hasKeyword && level === 'low') {
          priority = 'low';
        }
      });

      this.analysisResults.priorities.push({
        insight,
        priority,
        complexity: this.analysisResults.complexityAnalysis[insight] || 'medium',
        isConsensus
      });
    });

    // Sort by priority and complexity
    this.analysisResults.priorities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const complexityOrder = { low: 3, medium: 2, high: 1 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return complexityOrder[b.complexity] - complexityOrder[a.complexity];
    });
  }

  createImplementationPlan() {
    console.log('🗺️ Creating implementation roadmap...');
    
    const highPriority = this.analysisResults.priorities.filter(p => p.priority === 'high');
    const mediumPriority = this.analysisResults.priorities.filter(p => p.priority === 'medium');
    const lowPriority = this.analysisResults.priorities.filter(p => p.priority === 'low');

    this.analysisResults.implementationPlan = [
      {
        phase: 'Phase 1: High Priority Items',
        items: highPriority.slice(0, 5),
        estimatedDays: highPriority.slice(0, 5).length * 2
      },
      {
        phase: 'Phase 2: Medium Priority Items',
        items: mediumPriority.slice(0, 8),
        estimatedDays: mediumPriority.slice(0, 8).length * 1.5
      },
      {
        phase: 'Phase 3: Low Priority Items',
        items: lowPriority.slice(0, 5),
        estimatedDays: lowPriority.slice(0, 5).length * 1
      }
    ];

    // Generate specific recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    const topItems = this.analysisResults.priorities.slice(0, 10);
    
    this.analysisResults.recommendations = topItems.map((item, index) => ({
      rank: index + 1,
      title: this.generateTitle(item.insight),
      description: item.insight,
      priority: item.priority,
      complexity: item.complexity,
      estimatedHours: this.estimateHours(item.complexity),
      files: this.suggestFiles(item.insight),
      dependencies: this.suggestDependencies(item.insight),
      implementation: this.generateImplementationSteps(item.insight)
    }));
  }

  generateTitle(insight) {
    const words = insight.split(' ').slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  estimateHours(complexity) {
    const estimates = { low: 4, medium: 12, high: 24 };
    return estimates[complexity] || 12;
  }

  suggestFiles(insight) {
    const suggestions = [];
    const lowerInsight = insight.toLowerCase();
    
    if (lowerInsight.includes('component') || lowerInsight.includes('ui')) {
      suggestions.push('src/components/');
    }
    if (lowerInsight.includes('service') || lowerInsight.includes('api')) {
      suggestions.push('src/services/');
    }
    if (lowerInsight.includes('screen') || lowerInsight.includes('page')) {
      suggestions.push('src/screens/');
    }
    if (lowerInsight.includes('navigation') || lowerInsight.includes('route')) {
      suggestions.push('src/navigation/');
    }
    
    return suggestions.length > 0 ? suggestions : ['src/'];
  }

  suggestDependencies(insight) {
    const deps = [];
    const lowerInsight = insight.toLowerCase();
    
    if (lowerInsight.includes('animation')) deps.push('react-native-reanimated');
    if (lowerInsight.includes('gesture')) deps.push('react-native-gesture-handler');
    if (lowerInsight.includes('camera')) deps.push('expo-camera');
    if (lowerInsight.includes('location')) deps.push('expo-location');
    if (lowerInsight.includes('nfc')) deps.push('react-native-nfc-manager');
    if (lowerInsight.includes('storage')) deps.push('@react-native-async-storage/async-storage');
    
    return deps;
  }

  generateImplementationSteps(insight) {
    return [
      'Create necessary files and components',
      'Implement core functionality',
      'Add error handling and validation',
      'Write tests for new features',
      'Update documentation',
      'Test on multiple devices'
    ];
  }

  saveAnalysis(originalFilePath, topic) {
    const timestamp = Date.now();
    const analysisDir = path.join(path.dirname(originalFilePath), '..', 'analysis-results');
    
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
    }

    const analysisFile = path.join(analysisDir, `analysis-${topic.replace(/\\s+/g, '-')}-${timestamp}.json`);
    const reportFile = path.join(analysisDir, `analysis-${topic.replace(/\\s+/g, '-')}-${timestamp}.md`);

    // Save JSON analysis
    fs.writeFileSync(analysisFile, JSON.stringify(this.analysisResults, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(topic);
    fs.writeFileSync(reportFile, markdownReport);

    console.log(`📄 Analysis saved to: ${analysisFile}`);
    console.log(`📝 Report saved to: ${reportFile}`);
  }

  generateMarkdownReport(topic) {
    const { consensus, claudeUnique, chatgptUnique, priorities, implementationPlan, recommendations } = this.analysisResults;
    
    return `# Research Analysis Report: ${topic}

*Generated on ${new Date().toLocaleString()}*

## 🤝 Consensus Insights (${consensus.length})
Both Claude and ChatGPT recommend:

${consensus.map((item, i) => `${i + 1}. ${item}`).join('\\n')}

## 🧠 Claude-Specific Insights (${claudeUnique.length})
Unique recommendations from Claude:

${claudeUnique.map((item, i) => `${i + 1}. ${item}`).join('\\n')}

## 💬 ChatGPT-Specific Insights (${chatgptUnique.length})
Unique recommendations from ChatGPT:

${chatgptUnique.map((item, i) => `${i + 1}. ${item}`).join('\\n')}

## 🎯 Top 10 Recommendations

${recommendations.slice(0, 10).map(rec => `
### ${rec.rank}. ${rec.title}
- **Priority**: ${rec.priority.toUpperCase()}
- **Complexity**: ${rec.complexity.toUpperCase()}
- **Estimated Hours**: ${rec.estimatedHours}
- **Files**: ${rec.files.join(', ')}
- **Dependencies**: ${rec.dependencies.join(', ') || 'None'}

**Description**: ${rec.description}

**Implementation Steps**:
${rec.implementation.map(step => `- ${step}`).join('\\n')}
`).join('\\n')}

## 🗺️ Implementation Roadmap

${implementationPlan.map(phase => `
### ${phase.phase}
**Estimated Duration**: ${phase.estimatedDays} days

${phase.items.map((item, i) => `${i + 1}. [${item.priority.toUpperCase()}] ${item.insight}`).join('\\n')}
`).join('\\n')}

## 📊 Priority Distribution
- **High Priority**: ${priorities.filter(p => p.priority === 'high').length} items
- **Medium Priority**: ${priorities.filter(p => p.priority === 'medium').length} items
- **Low Priority**: ${priorities.filter(p => p.priority === 'low').length} items

## 🔧 Complexity Analysis
- **Low Complexity**: ${priorities.filter(p => p.complexity === 'low').length} items
- **Medium Complexity**: ${priorities.filter(p => p.complexity === 'medium').length} items
- **High Complexity**: ${priorities.filter(p => p.complexity === 'high').length} items

## 🚀 Next Steps
1. Review the top 10 recommendations
2. Select items for immediate implementation
3. Run: \`node scripts/auto-implement.js --analysis-file=[this-file] --priority=high\`
4. Test implemented features in the developer menu

---
*This analysis was generated automatically from AI research results.*`;
  }

  printSummary() {
    console.log('\\n📊 Analysis Summary:');
    console.log(`   🤝 Consensus items: ${this.analysisResults.consensus.length}`);
    console.log(`   🧠 Claude unique: ${this.analysisResults.claudeUnique.length}`);
    console.log(`   💬 ChatGPT unique: ${this.analysisResults.chatgptUnique.length}`);
    console.log(`   🎯 Total recommendations: ${this.analysisResults.recommendations.length}`);
    console.log(`   🚀 High priority items: ${this.analysisResults.priorities.filter(p => p.priority === 'high').length}`);
  }
}

// CLI Usage
function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Usage: node scripts/analyze-research.js <research-file.json>');
    console.log('Example: node scripts/analyze-research.js docs/research/research-results/new-feature-ideas-1754147618066.json');
    process.exit(1);
  }

  const analyzer = new ResearchAnalyzer();
  analyzer.analyzeResearchFile(filePath);
}

if (require.main === module) {
  main();
}

module.exports = ResearchAnalyzer;