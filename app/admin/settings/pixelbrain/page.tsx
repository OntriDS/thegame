'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  BrainCircuit,
  Users,
  DollarSign,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function PixelbrainSettingsPage() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [connectionId, setConnectionId] = useState<string>('');
  const [discoveredTools, setDiscoveredTools] = useState<number>(0);

  // Connection form state
  const [endpoint, setEndpoint] = useState('https://pixelbrain.vercel.app');
  const [apiKey, setApiKey] = useState('');
  const [timeout, setTimeout] = useState<number>(30000);
  const [enableWebSockets, setEnableWebSockets] = useState(true);

  // LLM configuration state
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'zai' | 'gemini'>('groq');
  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({});
  const [defaultTemperature, setDefaultTemperature] = useState<number>(0.7);
  const [defaultMaxTokens, setDefaultMaxTokens] = useState<number>(2048);

  // Agent preferences state
  const [agents, setAgents] = useState<Array<{
    id: string;
    name: string;
    enabled: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
    llmProvider?: string;
  }>>([]);

  // Cost management state
  const [budgetLimit, setBudgetLimit] = useState<number>(1000);
  const [alertThreshold, setAlertThreshold] = useState<number>(100);
  const [enableCostAlerts, setEnableCostAlerts] = useState(true);
  const [currentUsage, setCurrentUsage] = useState<number>(0);

  // Error/Status messages
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Mock agent data
  useEffect(() => {
    setAgents([
      { id: 'data-integrity', name: 'Data Integrity Validator', enabled: true, priority: 'high' },
      { id: 'time-planning', name: 'Time Planning Agent', enabled: true, priority: 'medium', llmProvider: 'groq' },
      { id: 'tasks-organization', name: 'Tasks Organization Agent', enabled: true, priority: 'medium' },
      { id: 'prepare-classes', name: 'Prepare Classes Agent', enabled: false, priority: 'low' },
      { id: 'marketing', name: 'Marketing Agent', enabled: false, priority: 'low' },
      { id: 'data-analysis', name: 'Data Analysis Agent', enabled: true, priority: 'medium', llmProvider: 'zai' },
      { id: 'game-design', name: 'Game Design Agent', enabled: false, priority: 'low' },
    ]);
  }, []);

  // Handle connection
  const handleConnect = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setConnectionStatus('connecting');

    try {
      const response = await fetch('/api/pixelbrain/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-jwt-token', // Replace with actual auth
        },
        body: JSON.stringify({
          endpoint,
          apiKey: apiKey || undefined,
          timeout,
          enableWebSockets,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('connected');
        setConnectionId(data.connectionId);
        setDiscoveredTools(data.discoveredTools);
        setSuccessMessage('Successfully connected to pixelbrain!');
      } else {
        setConnectionStatus('error');
        setErrorMessage(data.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Failed to connect to pixelbrain. Please check your settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/pixelbrain/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-jwt-token',
        },
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('disconnected');
        setConnectionId('');
        setDiscoveredTools(0);
        setSuccessMessage('Disconnected from pixelbrain.');
      }
    } catch (error) {
      setErrorMessage('Failed to disconnect from pixelbrain.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle LLM configuration
  const handleConfigureLLM = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/pixelbrain/llm/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-jwt-token',
        },
        body: JSON.stringify({
          providerId: selectedProvider,
          apiKey: providerApiKeys[selectedProvider],
          defaultSettings: {
            temperature: defaultTemperature,
            maxTokens: defaultMaxTokens,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`${data.provider.name} configured successfully!`);
      } else {
        setErrorMessage(data.error || 'Configuration failed');
      }
    } catch (error) {
      setErrorMessage('Failed to configure LLM provider.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle agent
  const handleToggleAgent = (agentId: string) => {
    setAgents(agents.map(agent =>
      agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent
    ));
  };

  // Get connection status badge
  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="border-blue-600 text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Connecting</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="border-gray-600 text-gray-600"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">pixelbrain Settings</h1>
          <p className="text-muted-foreground">Configure and manage pixelbrain AI integration</p>
        </div>
        <div className="flex items-center gap-2">
          {getConnectionBadge()}
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status messages */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription className="text-green-600">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Connection
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            LLM Settings
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Costs
          </TabsTrigger>
        </TabsList>

        {/* Connection Settings Tab */}
        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>
                Configure your pixelbrain connection settings. Make sure you have a valid API key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">pixelbrain Endpoint</Label>
                <Input
                  id="endpoint"
                  type="url"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://pixelbrain.vercel.app"
                  disabled={connectionStatus === 'connected'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key (Optional)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your pixelbrain API key"
                  disabled={connectionStatus === 'connected'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(parseInt(e.target.value))}
                  min={1000}
                  max={300000}
                  disabled={connectionStatus === 'connected'}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="websockets">Enable WebSockets</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable real-time updates via WebSocket connection
                  </p>
                </div>
                <Switch
                  id="websockets"
                  checked={enableWebSockets}
                  onCheckedChange={setEnableWebSockets}
                  disabled={connectionStatus === 'connected'}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {connectionStatus === 'connected' ? (
                  <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleConnect} disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>

              {connectionStatus === 'connected' && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="font-medium text-green-900 dark:text-green-100">Connected Successfully</p>
                  <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>Connection ID: {connectionId}</p>
                    <p>Discovered Tools: {discoveredTools}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM Settings Tab */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Configuration</CardTitle>
              <CardDescription>
                Configure Large Language Model providers and settings for AI agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">LLM Provider</Label>
                <select
                  id="provider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={connectionStatus !== 'connected'}
                >
                  <option value="groq">Groq AI</option>
                  <option value="zai">Z AI</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="providerApiKey">API Key</Label>
                <Input
                  id="providerApiKey"
                  type="password"
                  value={providerApiKeys[selectedProvider] || ''}
                  onChange={(e) =>
                    setProviderApiKeys({ ...providerApiKeys, [selectedProvider]: e.target.value })
                  }
                  placeholder={`Enter your ${selectedProvider.toUpperCase()} API key`}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={defaultTemperature}
                    onChange={(e) => setDefaultTemperature(parseFloat(e.target.value))}
                    min={0}
                    max={2}
                    step={0.1}
                    disabled={connectionStatus !== 'connected'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={defaultMaxTokens}
                    onChange={(e) => setDefaultMaxTokens(parseInt(e.target.value))}
                    min={1}
                    max={128000}
                    disabled={connectionStatus !== 'connected'}
                  />
                </div>
              </div>

              <Button
                onClick={handleConfigureLLM}
                disabled={isLoading || connectionStatus !== 'connected'}
                className="w-full"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Configure Provider
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Preferences</CardTitle>
              <CardDescription>
                Manage AI agent settings, priorities, and LLM providers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{agent.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={agent.priority === 'high' ? 'default' : 'outline'}>
                          {agent.priority}
                        </Badge>
                        {agent.llmProvider && (
                          <Badge variant="secondary">{agent.llmProvider}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`agent-${agent.id}`}>Enabled</Label>
                        <Switch
                          id={`agent-${agent.id}`}
                          checked={agent.enabled}
                          onCheckedChange={() => handleToggleAgent(agent.id)}
                          disabled={connectionStatus !== 'connected'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Enabled agents can be used for task delegation. Priority determines task execution order.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Management</CardTitle>
              <CardDescription>
                Set budget limits and monitor AI usage costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Usage</span>
                  <Badge variant="outline">This Month</Badge>
                </div>
                <div className="text-3xl font-bold">${currentUsage.toFixed(2)}</div>
                <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${(currentUsage / budgetLimit) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  ${(budgetLimit - currentUsage).toFixed(2)} remaining of ${budgetLimit.toFixed(2)} budget
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetLimit">Monthly Budget Limit ($)</Label>
                  <Input
                    id="budgetLimit"
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(parseFloat(e.target.value))}
                    min={0}
                    step={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">Alert Threshold ($)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
                    min={0}
                    step={10}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="costAlerts">Enable Cost Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when spending reaches threshold
                  </p>
                </div>
                <Switch
                  id="costAlerts"
                  checked={enableCostAlerts}
                  onCheckedChange={setEnableCostAlerts}
                />
              </div>

              <Button variant="outline" className="w-full" disabled={connectionStatus !== 'connected'}>
                View Detailed Usage
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
