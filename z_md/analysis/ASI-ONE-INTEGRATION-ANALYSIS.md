# ASI:One Integration Analysis & Implementation Plan

**Status**: Planning Phase | **Date**: January 2025  
**Purpose**: Integrate ASI:One AI platform into Research Section with website crawling capabilities

---

## Executive Summary

ASI:One is an intelligent AI platform that offers **OpenAI-compatible API** with **advanced agentic capabilities** and **Agentverse marketplace integration**. Unlike Groq, ASI:One supports **tool calling**, **web search**, and **session-based agent orchestration** - enabling dynamic website interaction and content retrieval.

---

## 1. Platform Capabilities

### Core Features
- ✅ **OpenAI-Compatible API** - Seamless integration with existing patterns
- ✅ **Tool Calling** - Custom function execution for website crawling
- ✅ **Web Search** - Built-in search capabilities
- ✅ **Agentverse Integration** - Access to agent marketplace
- ✅ **Session Persistence** - x-session-id for agentic models
- ✅ **Streaming Support** - Real-time response streaming

### Model Portfolio
| Model | Context | Benchmark | Best For | Tools | Session |
|-------|---------|-----------|----------|-------|---------|
| asi1-mini | 128K | 85% | General chat, everyday tasks | ✅ | ❌ |
| asi1-fast | 64K | 87% | Ultra-low latency, real-time | ✅ | ❌ |
| asi1-extended | 64K | 89% | Complex reasoning, deep analysis | ✅ | ❌ |
| asi1-agentic | 64K | 85% | Agent discovery & orchestration | ✅ | ✅ |
| asi1-fast-agentic | 64K | 85% | Real-time agent workflows | ✅ | ✅ |
| asi1-extended-agentic | 64K | 85% | Complex multi-step workflows | ✅ | ✅ |
| asi1-graph | 64K | 85% | Data visualization, charts | ✅ | ❌ |

---

## 2. Architecture Analysis

### Current System (Groq)
```
User → AI Assistant Tab → useAIChat Hook → /api/ai/chat → Groq API
```

### Proposed System (ASI:One)
```
User → AI Assistant Tab → useAIChat Hook → /api/ai/chat
                                         ↓
                                    Provider Router
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    ↓                                          ↓
            /api/ai/groq/route.ts                    /api/ai/asi-one/route.ts
                    ↓                                          ↓
              Groq API                                ASI:One API + Tools
                                                               ↓
                                                    [Tool: fetch_my_website]
                                                    [Tool: get_project_status]
                                                    [Tool: search_dev_log]
```

### Key Architectural Decisions
1. **Separate API Routes** - Maintain clean separation: `/groq/` vs `/asi-one/`
2. **Unified Interface** - Single hook (`useAIChat`) supports both providers
3. **Model Grouping** - UI organizes models by category (performance vs specialized)
4. **Tool Strategy** - ASI:One exclusive for tool-calling capabilities

---

## 3. Implementation Plan

### Phase 1: Foundation Setup (1-2 hours)
**Goal**: Establish API infrastructure

#### Tasks:
1. ✅ Create folder structure
   ```
   app/api/ai/
   ├── groq/
   │   ├── route.ts
   │   └── models/route.ts
   ├── asi-one/
   │   ├── route.ts
   │   ├── models/route.ts
   │   └── tools.ts (tool definitions)
   └── chat/route.ts (orchestrator)
   ```

2. ✅ Environment configuration
   - Add `ASI_ONE_API_KEY` to `.env.local`
   - Update `.env.example`
   - Configure Vercel environment variables

3. ✅ API route implementation
   - `/api/ai/asi-one/route.ts` - Chat completions with tool calling
   - `/api/ai/asi-one/models/route.ts` - Model listing
   - `/api/ai/asi-one/tools.ts` - Tool definitions

#### Tools to Implement:
```typescript
// Tool 1: Fetch website content
fetch_my_website: {
  name: "fetch_my_website",
  description: "Fetches content from local website pages (docs, research, status)",
  parameters: {
    url: "string", // e.g., "/z_md/THEGAME_WIKI.md"
    page_type: "string" // "wiki", "research", "logs"
  }
}

// Tool 2: Get project status
get_project_status: {
  name: "get_project_status",
  description: "Retrieves current PROJECT-STATUS.json data",
  parameters: {}
}

// Tool 3: Search dev logs
search_dev_log: {
  name: "search_dev_log",
  description: "Searches through dev-log.json for specific information",
  parameters: {
    query: "string",
    date_range: "string" // optional
  }
}
```

### Phase 2: UI Enhancement (1-2 hours)
**Goal**: Model selection and grouping interface

#### Tasks:
1. ✅ Update `use-ai-chat.ts`
   - Add provider selection (groq | asi-one)
   - Support model categorization
   - Handle tool call responses

2. ✅ Enhance `ai-assistant-tab.tsx`
   - Add model category selector (searchable)
   - Display tool availability badges
   - Show session ID for agentic models

#### Model Groups UI:
```typescript
modelCategories = {
  'Groq - Speed': { models: [...], icon: 'zap' },
  'ASI:One - General': { models: ['asi1-mini', 'asi1-fast'], icon: 'bot', tools: true },
  'ASI:One - Reasoning': { models: ['asi1-extended'], icon: 'brain', tools: true },
  'ASI:One - Agentic': { models: ['asi1-agentic'], icon: 'sparkles', tools: true, session: true },
  'ASI:One - Specialized': { models: ['asi1-graph'], icon: 'chart', tools: true }
}
```

### Phase 3: Tool Implementation (2-3 hours)
**Goal**: Enable website crawling functionality

#### Tasks:
1. ✅ Implement tool functions
   - File system reading utilities
   - JSON parsing for project status
   - Dev log search functionality

2. ✅ Tool call handling
   - Parse `tool_calls` from ASI:One response
   - Execute tools server-side
   - Return results to model
   - Handle multi-turn tool conversations

3. ✅ Session management
   - Generate/retain session IDs for agentic models
   - Store session state
   - Enable conversation persistence

### Phase 4: Testing & Integration (1 hour)
**Goal**: Verify functionality and edge cases

#### Tasks:
1. ✅ Test all 7 ASI:One models
2. ✅ Verify tool calling end-to-end
3. ✅ Test session persistence
4. ✅ Validate web search capability
5. ✅ Performance benchmarking vs Groq

---

## 4. Technical Specifications

### API Compatibility
**Base URL**: `https://api.asi1.ai/v1`

**Standard OpenAI Parameters**:
- `model`, `messages`, `temperature`, `max_tokens`, `top_p`, `frequency_penalty`, `presence_penalty`, `stream`

**ASI:One Extensions**:
- `extra_body.web_search` - Enable web search
- `extra_headers["x-session-id"]` - AgentPersistence for agentic models
- `tools` - Tool definitions array

### Response Structure
```typescript
{
  choices: [{ message: { content, tool_calls } }],
  executable_data: [], // Agent calls
  intermediate_steps: [], // Reasoning
  thought: [], // Model thinking
  usage: { prompt_tokens, completion_tokens }
}
```

### Tool Call Flow
1. **User Message** → ASI:One
2. **ASI:One Response** → Contains `tool_calls`
3. **Execute Tools** → Server-side execution
4. **Tool Results** → Back to ASI:One
5. **Final Response** → User receives answer

---

## 5. Security Considerations

### API Key Management
- ✅ Never commit API keys to git
- ✅ Store in `.env.local` for development
- ✅ Configure Vercel environment variables for production
- ✅ Rotate keys if exposed

### Tool Execution Security
- ✅ Validate all tool parameters
- ✅ Sanitize file paths (prevent directory traversal)
- ✅ Limit file access scope
- ✅ Timeout protection for slow operations

### Rate Limiting
- Monitor token usage
- Implement request throttling
- Cache tool results when appropriate

---

## 6. Cost Analysis

### Pricing (Estimated)
- Similar to Groq pricing model
- Tool calls may incur additional token costs
- Web search likely has usage limits

### Optimization Strategies
- Cache frequently accessed data
- Use streaming for long responses
- Select appropriate model for task (mini vs extended)
- Batch tool calls when possible

---

## 7. Success Metrics

### Functional Requirements
- ✅ All 7 ASI:One models accessible
- ✅ Tool calling works for website content
- ✅ Session persistence functional
- ✅ Web search operational
- ✅ UI groups models logically

### Performance Requirements
- Response time < 3s for simple queries
- Tool execution < 2s per tool
- Streaming latency < 500ms
- 99% uptime matching Groq

### User Experience
- Clear model selection interface
- Visual tool availability indicators
- Seamless provider switching
- Error messages are actionable

---

## 8. Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| API instability | High | Fallback to Groq |
| Tool execution errors | Medium | Comprehensive error handling |
| Session persistence failures | Low | Session ID regeneration |
| Web search rate limits | Medium | Caching + retries |

### Implementation Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Medium | Phased approach, defined phases |
| Tool complexity | Medium | Start simple, iterate |
| UI clutter | Low | Model grouping solves this |

---

## 9. Future Enhancements

### Post-Launch
1. **Advanced Tools**
   - Database query tools
   - Task creation from AI suggestions
   - Financial analysis tools

2. **Agent Discovery**
   - Browse Agentverse marketplace
   - Select specialized agents
   - Agent recommendation system

3. **Custom Agents**
   - Create project-specific agents
   - Train on domain knowledge
   - Deploy to Agentverse

---

## 10. Documentation Plan

### Developer Docs
- API route specifications
- Tool implementation guide
- Model selection recommendations

### User Docs
- Quick start guide
- Model comparison table
- Tool usage examples

### Internal Notes
- Implementation decisions log
- Performance benchmarks
- Troubleshooting guide

---

## Conclusion

ASI:One integration represents a **significant capability upgrade** over Groq for Research Section use cases. The combination of **tool calling**, **web search**, and **agentic models** enables dynamic website interaction that Groq cannot provide.

**Recommendation**: Proceed with phased implementation as outlined above. Start with Phase 1 (Foundation) to validate API connectivity, then incrementally add features.

**Timeline**: 5-8 hours total implementation time  
**Priority**: High - Enhances Research Section capabilities significantly  
**Dependencies**: ASI_ONE_API_KEY, clear understanding of tool requirements

---

**Next Steps**:
1. Secure API key in environment variables
2. Implement Phase 1 (Foundation Setup)
3. Test basic connectivity
4. Iterate based on results

