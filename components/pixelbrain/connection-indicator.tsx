'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Connection status
 */
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'degraded';

/**
 * pixelbrain Connection Indicator Component
 *
 * This component displays the current pixelbrain connection status
 * with detailed information and quick access to settings.
 */

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  onToggleDetails?: () => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

export function ConnectionIndicator({
  showDetails: externalShowDetails,
  onToggleDetails: externalOnToggleDetails,
  onOpenSettings,
  onRefresh,
  className = '',
  compact = false,
}: ConnectionIndicatorProps) {
  // Internal state
  const [internalShowDetails, setInternalShowDetails] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionId, setConnectionId] = useState<string>('');
  const [latency, setLatency] = useState<number>(0);
  const [activeAgents, setActiveAgents] = useState<number>(0);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [uptime, setUptime] = useState<string>('0h 0m');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Use external or internal state
  const showDetails = externalShowDetails !== undefined ? externalShowDetails : internalShowDetails;
  const toggleDetails = externalOnToggleDetails || (() => setInternalShowDetails(!internalShowDetails));

  // Fetch connection status
  const fetchConnectionStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/pixelbrain/status', {
        headers: {
          'Authorization': 'Bearer your-jwt-token',
        },
      });

      const data = await response.json();

      if (data.connected) {
        setConnectionStatus('connected');
        setConnectionId(data.connectionId);
        setLatency(data.latency);
        setActiveAgents(data.activeAgents);
        setLastActivity(new Date(data.lastActivity));
        setUptime(formatUptime(data.uptime));
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Listen for external error events to trigger a check
  useEffect(() => {
    const handleCheckRequest = () => {
      console.log('[ConnectionIndicator] Check triggered by error/manual request');
      fetchConnectionStatus();
    };

    window.addEventListener('pixelbrain-check-connection', handleCheckRequest);
    return () => window.removeEventListener('pixelbrain-check-connection', handleCheckRequest);
  }, [fetchConnectionStatus]);

  // Format uptime
  const formatUptime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Get status color
  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-600';
      case 'connecting':
        return 'bg-blue-600';
      case 'disconnected':
        return 'bg-gray-600';
      case 'error':
        return 'bg-red-600';
      case 'degraded':
        return 'bg-yellow-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Get status text
  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      case 'degraded':
        return 'Degraded';
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    return (
      <Badge
        variant={connectionStatus === 'connected' ? 'default' : 'outline'}
        className={`${connectionStatus === 'connected' ? 'bg-green-600' : connectionStatus === 'error' ? 'bg-red-600' : ''}`}
      >
        {getStatusIcon(connectionStatus)}
        <span className="ml-1">{getStatusText(connectionStatus)}</span>
      </Badge>
    );
  };

  // Compact mode - just show status
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusBadge()}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings || (() => window.location.href = '/admin/settings/pixelbrain')}
          title="Open pixelbrain Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full mode with details
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Status Bar */}
      <div className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)} ${
              connectionStatus === 'connecting' ? 'animate-pulse' : ''
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">pixelbrain</span>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              {connectionStatus === 'connected'
                ? 'AI system operational'
                : connectionStatus === 'connecting'
                ? 'Establishing connection...'
                : 'Not connected to AI system'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh || fetchConnectionStatus}
            disabled={isRefreshing}
            title="Refresh connection status"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDetails}
            title="Toggle details"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings || (() => window.location.href = '/admin/settings/pixelbrain')}
            title="Open pixelbrain Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detailed Information Panel */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card border rounded-lg animate-in slide-in-from-top-2">
          {/* Connection ID */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Connection ID</p>
            <p className="font-medium text-sm">{connectionId || 'N/A'}</p>
          </div>

          {/* Latency */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Latency</p>
            <p className="font-medium text-sm">{latency > 0 ? `${latency}ms` : 'N/A'}</p>
          </div>

          {/* Active Agents */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active Agents</p>
            <p className="font-medium text-sm">{activeAgents}</p>
          </div>

          {/* Uptime */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="font-medium text-sm">{uptime}</p>
          </div>

          {/* Last Activity */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Activity</p>
            <p className="font-medium text-sm">
              {lastActivity.toLocaleTimeString()}
            </p>
          </div>

          {/* Connection Quality */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Quality</p>
            <div className="flex items-center gap-1">
              {getStatusIcon(connectionStatus)}
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' && latency < 100
                  ? 'Excellent'
                  : connectionStatus === 'connected' && latency < 200
                  ? 'Good'
                  : connectionStatus === 'connected'
                  ? 'Fair'
                  : getStatusText(connectionStatus)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.location.href = '/admin/pixelbrain'}
            >
              View Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.location.href = '/admin/settings/pixelbrain'}
            >
              Open Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Default export for convenience
 */
export default ConnectionIndicator;
