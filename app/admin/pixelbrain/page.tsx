'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw,
  Loader2,
  Settings,
} from "lucide-react";

export default function PixelbrainDashboardPage() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('unhealthy');
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [uptime, setUptime] = useState<string>('0h 0m');

  // System metrics
  const [activeAgents, setActiveAgents] = useState<number>(0);
  const [totalAgents, setTotalAgents] = useState<number>(7);
  const [systemLoad, setSystemLoad] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(0);

  // Agent activity data
  const [agents, setAgents] = useState<Array<{
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'error' | 'degraded';
    health: 'healthy' | 'degraded' | 'unhealthy';
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    errorRate: number;
    uptime: string;
  }>>([]);

  // Recent tasks
  const [recentTasks, setRecentTasks] = useState<Array<{
    id: string;
    type: string;
    agent: string;
    status: 'queued' | 'in-progress' | 'completed' | 'failed';
    duration: string;
    cost: number;
    timestamp: Date;
  }>>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Error messages
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/pixelbrain/status', {
        headers: {
          'Authorization': 'Bearer your-jwt-token',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus(data.systemHealth);
        setActiveAgents(data.activeAgents);
        setLatency(data.latency);
        setTotalRequests(data.totalRequests);
        if (data.lastActivity) {
          setLastActivity(new Date(data.lastActivity));
        }
        setErrorMessage('');
      } else {
        setErrorMessage(data.error || 'Failed to fetch pixelbrain status');
        setConnectionStatus('unhealthy');
      }
    } catch (error) {
      setErrorMessage('Failed to connect to pixelbrain. Please check your connection settings.');
      setConnectionStatus('unhealthy');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get health status badge
  const getHealthBadge = (health: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (health) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Unhealthy</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Running</Badge>;
      case 'stopped':
        return <Badge variant="outline" className="border-gray-600 text-gray-600"><Clock className="h-3 w-3 mr-1" />Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get task status badge
  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="border-blue-600 text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>;
      case 'queued':
        return <Badge variant="outline" className="border-gray-600 text-gray-600"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">pixelbrain Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring and status overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isRefreshing}>
            {isRefreshing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/settings/pixelbrain'}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getHealthBadge(connectionStatus)}</div>
            <p className="text-xs text-muted-foreground">
              Last activity: {lastActivity.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}/{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {totalAgents - activeAgents} agents stopped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Latency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latency}ms</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Since system start
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Activity Monitor */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Activity Monitor</CardTitle>
            <CardDescription>
              Real-time status and performance metrics for all agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                      {getStatusBadge(agent.status)}
                      {getHealthBadge(agent.health)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Active:</span> {agent.activeTasks}
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span> {agent.completedTasks}
                      </div>
                      <div>
                        <span className="font-medium">Failed:</span> {agent.failedTasks}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Uptime: {agent.uptime}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Error Rate: {(agent.errorRate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>
              Latest task execution results and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm capitalize">{task.type}</h3>
                      {getTaskStatusBadge(task.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{task.agent}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Duration: {task.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Cost: ${task.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-2">
                    {Math.floor((Date.now() - task.timestamp.getTime()) / 60000)}m ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
