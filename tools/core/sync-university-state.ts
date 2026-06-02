import * as fs from 'fs';
import * as path from 'path';

/**
 * sync-university-state.ts
 *
 * This tool parses the university-state.md markdown file from Pixelbrain
 * and synchronizes TheGame Database (Upstash Redis) with the data.
 * The markdown file is the Source of Truth for the agents' education and knowledge fields.
 */

export async function syncUniversityState() {
  console.log('Loading university-state.md...');
  const mdPath = path.resolve(process.cwd(), '../pixelbrain/.agents/university-state.md');
  
  if (!fs.existsSync(mdPath)) {
    throw new Error(`File not found: ${mdPath}`);
  }

  const content = fs.readFileSync(mdPath, 'utf8');

  // Parse Swarm State Machine table
  // Format: | analyst | [x] | [x] | [x] | [x] |
  const tableRegex = /\|\s*([a-zA-Z0-9_-]+)\s*\|\s*\[([ x])\]\s*\|\s*\[([ x])\]\s*\|\s*\[([ x])\]\s*\|\s*\[([ x])\]\s*\|/g;
  
  const agentsMap: Record<string, any> = {};

  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const slug = match[1].trim();
    if (slug === 'Agent' || slug === ':---') continue; // Skip header rows

    agentsMap[slug] = {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      status: 'active', // Default to active since they are in the university state
      educationState: {
        lessonCreated: match[2].toLowerCase() === 'x',
        educated: match[3].toLowerCase() === 'x',
        consolidated: match[4].toLowerCase() === 'x',
        pro: match[5].toLowerCase() === 'x',
      },
      knowledgeFields: []
    };
  }

  // Parse knowledge fields from info-pack
  const infoPackRegex = /<info-pack id="carreers-knowledge-fields"[^>]*>([\s\S]*?)<\/info-pack>/;
  const infoPackMatch = content.match(infoPackRegex);

  if (infoPackMatch) {
    const infoPackContent = infoPackMatch[1];
    
    // Split by **agent**: to parse each block
    const agentBlocks = infoPackContent.split(/\*\*(.*?)\*\*:/);
    
    for (let i = 1; i < agentBlocks.length; i += 2) {
      const slug = agentBlocks[i].trim();
      const fieldsText = agentBlocks[i + 1];
      
      const fields = fieldsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim()) // Remove the hyphen
        .filter(field => field.length > 0 && field !== 'No specific fields defined yet.');
      
      if (agentsMap[slug]) {
        agentsMap[slug].knowledgeFields = fields;
      }
    }
  }

  const agentSlugs = Object.keys(agentsMap);
  console.log(`Parsed ${agentSlugs.length} agents from markdown.`);

  if (agentSlugs.length === 0) {
    console.warn('No agents found in the markdown table. Aborting sync.');
    return;
  }

  // Import DataStore dynamically
  const { upsertAgent, getAgentById } = await import('../../data-store/datastore');

  // Upsert all agents into TheGame database
  console.log('Synchronizing agents with TheGame Database...');
  
  // We need to import enums as well
  const { EntityType } = await import('../../types/enums');

  let count = 0;
  for (const slug of agentSlugs) {
    const agentData = agentsMap[slug];
    
    // Check if agent already exists to preserve ID
    // We will use slug as a deterministic fallback ID for new agents if needed,
    // or just let the database generate one. Actually, standardizing ID to 'agent:{slug}' is safer.
    const agentId = `agent:${slug}`;
    
    const existingAgent = await getAgentById(agentId);
    
    const agentEntity: any = {
      ...(existingAgent || {}),
      id: agentId,
      type: EntityType.AGENT,
      name: agentData.name,
      slug: agentData.slug,
      status: agentData.status,
      educationState: agentData.educationState,
      knowledgeFields: agentData.knowledgeFields,
    };
    
    // Add creation date if new
    if (!existingAgent) {
      agentEntity.createdAt = new Date().toISOString();
    }
    agentEntity.updatedAt = new Date().toISOString();

    await upsertAgent(agentEntity);
    count++;
  }

  console.log(`Success! Synchronized ${count} agents into TheGame Database.`);
}

// Execute if run directly
if (require.main === module) {
  syncUniversityState().catch((err) => {
    console.error('Error in sync-university-state:', err);
    process.exit(1);
  });
}
