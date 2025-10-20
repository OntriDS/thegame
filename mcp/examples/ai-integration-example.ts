// lib/mcp/examples/ai-integration-example.ts
// Example of how to use MCP for AI integration

import { mcpClient } from '../mcp-client';

/**
 * Example: AI-powered task management
 * This shows how an AI model could interact with your game data
 */
export class AITaskManager {
  
  /**
   * AI analyzes tasks and suggests priorities
   */
  async analyzeAndPrioritizeTasks(): Promise<void> {
    console.log('🤖 AI analyzing tasks...');
    
    // Get all tasks
    const tasksResponse = await mcpClient.getTasks();
    if (!tasksResponse.success) {
      console.error('Failed to get tasks:', tasksResponse.error);
      return;
    }
    
    const tasks = tasksResponse.data;
    console.log(`Found ${tasks.length} tasks to analyze`);
    
    // AI logic: prioritize tasks based on some criteria
    for (const task of tasks) {
      if (task.status === 'pending') {
        let suggestedPriority = 'medium';
        
        // Simple AI logic: prioritize based on keywords
        if (task.title.toLowerCase().includes('urgent') || 
            task.title.toLowerCase().includes('critical')) {
          suggestedPriority = 'high';
        } else if (task.title.toLowerCase().includes('low') || 
                   task.title.toLowerCase().includes('optional')) {
          suggestedPriority = 'low';
        }
        
        // Update task if priority changed
        if (task.priority !== suggestedPriority) {
          const updateResponse = await mcpClient.updateTask(task.id, {
            priority: suggestedPriority
          });
          
          if (updateResponse.success) {
            console.log(`✅ Updated task "${task.title}" priority to ${suggestedPriority}`);
          } else {
            console.error(`❌ Failed to update task "${task.title}":`, updateResponse.error);
          }
        }
      }
    }
  }
  
  /**
   * AI creates tasks based on system analysis
   */
  async createMaintenanceTasks(): Promise<void> {
    console.log('🤖 AI creating maintenance tasks...');
    
    // Get system status
    const statusResponse = await mcpClient.getSystemStatus();
    if (!statusResponse.success) {
      console.error('Failed to get system status:', statusResponse.error);
      return;
    }
    
    const status = statusResponse.data;
    console.log('System status:', status);
    
    // AI logic: create tasks based on system state
    const tasksToCreate = [];
    
    if (status.entityCounts.tasks > 50) {
      tasksToCreate.push({
        title: 'Task Cleanup Needed',
        description: `High task count detected (${status.entityCounts.tasks}). Consider reviewing and cleaning up old tasks.`,
        priority: 'medium'
      });
    }
    
    if (status.entityCounts.items === 0) {
      tasksToCreate.push({
        title: 'No Items Found',
        description: 'No items in the system. Consider adding some initial items.',
        priority: 'high'
      });
    }
    
    if (status.entityCounts.sites < 5) {
      tasksToCreate.push({
        title: 'Low Site Count',
        description: `Only ${status.entityCounts.sites} sites available. Consider adding more locations.`,
        priority: 'low'
      });
    }
    
    // Create the tasks
    for (const taskData of tasksToCreate) {
      const createResponse = await mcpClient.createTask(taskData);
      if (createResponse.success) {
        console.log(`✅ Created task: "${taskData.title}"`);
      } else {
        console.error(`❌ Failed to create task "${taskData.title}":`, createResponse.error);
      }
    }
  }
  
  /**
   * AI analyzes logs for patterns
   */
  async analyzeLogs(): Promise<void> {
    console.log('🤖 AI analyzing logs...');
    
    const logTypes = ['tasks', 'items', 'character', 'player', 'sales', 'sites'];
    
    for (const logType of logTypes) {
      const logsResponse = await mcpClient.getLogs(logType, 10); // Get last 10 entries
      if (!logsResponse.success) {
        console.error(`Failed to get ${logType} logs:`, logsResponse.error);
        continue;
      }
      
      const logs = logsResponse.data;
      console.log(`\n📊 ${logType} logs (last 10):`);
      
      // AI logic: analyze log patterns
      const statusCounts: Record<string, number> = {};
      logs.forEach((log: any) => {
        statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
      });
      
      console.log(`Status distribution:`, statusCounts);
      
      // AI insight: if too many errors, suggest action
      if (statusCounts.error > 3) {
        console.log(`⚠️ High error count in ${logType} logs: ${statusCounts.error} errors`);
      }
    }
  }
}

/**
 * Example: AI-powered system monitoring
 */
export class AISystemMonitor {
  
  /**
   * Monitor system health and create alerts
   */
  async monitorSystemHealth(): Promise<void> {
    console.log('🤖 AI monitoring system health...');
    
    const statusResponse = await mcpClient.getSystemStatus();
    if (!statusResponse.success) {
      console.error('Failed to get system status:', statusResponse.error);
      return;
    }
    
    const status = statusResponse.data;
    const alerts = [];
    
    // AI logic: detect potential issues
    if (status.entityCounts.tasks === 0) {
      alerts.push('No tasks found - system might be empty or reset');
    }
    
    if (status.entityCounts.players === 0) {
      alerts.push('No players found - Triforce might be missing');
    }
    
    if (status.entityCounts.sites === 0) {
      alerts.push('No sites found - location data might be missing');
    }
    
    // Report findings
    if (alerts.length > 0) {
      console.log('🚨 AI detected potential issues:');
      alerts.forEach(alert => console.log(`  - ${alert}`));
      
      // AI could create tasks to address issues
      for (const alert of alerts) {
        const taskResponse = await mcpClient.createTask({
          title: `AI Alert: ${alert}`,
          description: `AI detected: ${alert}. Please investigate.`,
          priority: 'high'
        });
        
        if (taskResponse.success) {
          console.log(`✅ Created alert task: ${alert}`);
        }
      }
    } else {
      console.log('✅ System health looks good!');
    }
  }
}

// Example usage
export async function runAIExamples() {
  console.log('🚀 Starting AI integration examples...\n');
  
  const taskManager = new AITaskManager();
  const systemMonitor = new AISystemMonitor();
  
  // Run examples
  await taskManager.analyzeAndPrioritizeTasks();
  await taskManager.createMaintenanceTasks();
  await taskManager.analyzeLogs();
  await systemMonitor.monitorSystemHealth();
  
  console.log('\n✅ AI integration examples completed!');
}
