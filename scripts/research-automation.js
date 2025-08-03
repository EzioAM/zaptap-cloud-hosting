#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AutomatedResearcher {
  constructor() {
    this.claudeKey = process.env.CLAUDE_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
    
    console.log('🔑 API Keys loaded:');
    console.log('Claude:', this.claudeKey ? 'Present' : 'Missing');
    console.log('OpenAI:', this.openaiKey ? 'Present' : 'Missing');
  }

  async researchTopic(topic) {
    console.log(`🔍 Researching: ${topic}`);
    
    const prompt = `Research improvements for the Zaptap mobile automation app regarding: ${topic}

Current app features:
- React Native with Expo
- NFC tag reading/writing
- QR code scanning
- Supabase backend
- Automation workflows
- Version history, analytics, comments

Provide:
1. Specific improvement suggestions
2. Implementation approaches
3. Best practices
4. Potential challenges
5. Code examples if applicable

Focus on practical, actionable insights.`;

    const results = await Promise.allSettled([
      this.queryClaude(prompt),
      this.queryChatGPT(prompt)
    ]);

    return {
      topic,
      claude: results[0].status === 'fulfilled' ? results[0].value : null,
      chatgpt: results[1].status === 'fulfilled' ? results[1].value : null,
      timestamp: new Date().toISOString()
    };
  }

  async queryClaude(prompt) {
    if (!this.claudeKey) {
      console.log('⚠️  Claude API key not found');
      return null;
    }
    
    try {
      console.log('🔄 Querying Claude...');
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': this.claudeKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      console.log('✅ Claude response received');
      return response.data.content[0].text;
    } catch (error) {
      console.error('❌ Claude API error:', error.response?.status, error.response?.statusText);
      console.error('Error details:', error.response?.data);
      return `Claude API Error: ${error.response?.status} - ${error.response?.statusText}`;
    }
  }

  async queryChatGPT(prompt) {
    if (!this.openaiKey) {
      console.log('⚠️  OpenAI API key not found');
      return null;
    }
    
    try {
      console.log('🔄 Querying ChatGPT...');
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ ChatGPT response received');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ ChatGPT API error:', error.response?.status, error.response?.statusText);
      console.error('Error details:', error.response?.data);
      return `ChatGPT API Error: ${error.response?.status} - ${error.response?.statusText}`;
    }
  }

  async saveResults(results) {
    const resultsDir = path.join(__dirname, '..', 'research-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `${results.topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`📄 Results saved to: ${filepath}`);

    // Also create a markdown summary
    const mdFilename = filename.replace('.json', '.md');
    const mdFilepath = path.join(resultsDir, mdFilename);
    const markdown = this.generateMarkdownReport(results);
    fs.writeFileSync(mdFilepath, markdown);
    console.log(`📝 Markdown report: ${mdFilepath}`);
  }

  generateMarkdownReport(results) {
    return `# Research Report: ${results.topic}

*Generated on ${new Date(results.timestamp).toLocaleString()}*

## Claude Insights

${results.claude || 'No response available'}

---

## ChatGPT Insights

${results.chatgpt || 'No response available'}

---

## Summary

Compare the insights above to identify:
- Common recommendations (consensus)
- Unique insights from each AI
- Implementation priorities
- Next steps

## Action Items

- [ ] Review technical feasibility
- [ ] Prioritize recommendations
- [ ] Create implementation plan
- [ ] Test proposed solutions
`;
  }
}

// CLI Usage
async function main() {
  const researcher = new AutomatedResearcher();
  const topic = process.argv[2];
  
  if (!topic) {
    console.log('Usage: node scripts/research-automation.js "your research topic"');
    console.log('Example: node scripts/research-automation.js "performance optimization"');
    process.exit(1);
  }

  try {
    console.log('🤖 Starting AI research...');
    const results = await researcher.researchTopic(topic);
    await researcher.saveResults(results);
    console.log('✅ Research complete!');
  } catch (error) {
    console.error('❌ Research failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AutomatedResearcher;