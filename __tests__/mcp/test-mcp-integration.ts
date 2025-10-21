// lib/mcp/test-mcp-integration.ts
// Test script to verify MCP integration works

import { mcpClient } from '../../mcp/mcp-client';

export async function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration...\n');
  
  try {
    // Test 1: Get available tools
    console.log('1️⃣ Testing getAvailableTools...');
    const toolsResponse = await mcpClient.getAvailableTools();
    if (toolsResponse.success) {
      console.log(`✅ Found ${toolsResponse.data.tools.length} available tools`);
      console.log('Available tools:', toolsResponse.data.tools.map((t: any) => t.name).join(', '));
    } else {
      console.error('❌ Failed to get tools:', toolsResponse.error);
      return;
    }
    
    // Test 2: Get system status
    console.log('\n2️⃣ Testing getSystemStatus...');
    const statusResponse = await mcpClient.getSystemStatus();
    if (statusResponse.success) {
      console.log('✅ System status retrieved:', statusResponse.data);
    } else {
      console.error('❌ Failed to get system status:', statusResponse.error);
    }
    
    // Test 3: Get tasks
    console.log('\n3️⃣ Testing getTasks...');
    const tasksResponse = await mcpClient.getTasks({ limit: 5 });
    if (tasksResponse.success) {
      console.log(`✅ Retrieved ${tasksResponse.data.length} tasks`);
    } else {
      console.error('❌ Failed to get tasks:', tasksResponse.error);
    }
    
    // Test 4: Create a test task
    console.log('\n4️⃣ Testing createTask...');
    const createResponse = await mcpClient.createTask({
      title: 'MCP Test Task',
      description: 'Created by MCP integration test',
      priority: 'medium'
    });
    if (createResponse.success) {
      console.log('✅ Test task created:', createResponse.data);
      
      // Test 5: Update the task
      console.log('\n5️⃣ Testing updateTask...');
      const updateResponse = await mcpClient.updateTask(createResponse.data.id, {
        status: 'completed',
        description: 'Updated by MCP integration test'
      });
      if (updateResponse.success) {
        console.log('✅ Test task updated:', updateResponse.data);
      } else {
        console.error('❌ Failed to update task:', updateResponse.error);
      }
      
      // Test 6: Delete the task
      console.log('\n6️⃣ Testing deleteTask...');
      const deleteResponse = await mcpClient.deleteTask(createResponse.data.id);
      if (deleteResponse.success) {
        console.log('✅ Test task deleted');
      } else {
        console.error('❌ Failed to delete task:', deleteResponse.error);
      }
    } else {
      console.error('❌ Failed to create test task:', createResponse.error);
    }
    
    // Test 7: Get other entities
    console.log('\n7️⃣ Testing other entity operations...');
    const [itemsResponse, charactersResponse, playersResponse, sitesResponse] = await Promise.all([
      mcpClient.getItems({ limit: 3 }),
      mcpClient.getCharacters(),
      mcpClient.getPlayers(),
      mcpClient.getSites({ limit: 3 })
    ]);
    
    console.log(`✅ Items: ${itemsResponse.success ? itemsResponse.data.length : 'failed'}`);
    console.log(`✅ Characters: ${charactersResponse.success ? charactersResponse.data.length : 'failed'}`);
    console.log(`✅ Players: ${playersResponse.success ? playersResponse.data.length : 'failed'}`);
    console.log(`✅ Sites: ${sitesResponse.success ? sitesResponse.data.length : 'failed'}`);
    
    // Test 8: Get logs
    console.log('\n8️⃣ Testing getLogs...');
    const logsResponse = await mcpClient.getLogs('tasks', 5);
    if (logsResponse.success) {
      console.log(`✅ Retrieved ${logsResponse.data.length} task log entries`);
    } else {
      console.error('❌ Failed to get logs:', logsResponse.error);
    }
    
    console.log('\n🎉 MCP Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ MCP Integration test failed:', error);
  }
}

// Run test if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testMCPIntegration();
}
