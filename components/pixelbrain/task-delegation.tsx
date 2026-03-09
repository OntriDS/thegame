'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Send,
  X,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

/**
 * Task delegation component for pixelbrain agents
 *
 * This component allows users to delegate tasks to pixelbrain agents,
 * configure parameters, and monitor execution progress.
 */

interface TaskDelegationProps {
  onTaskSubmitted?: (taskId: string) => void;
  className?: string;
}

export function TaskDelegation({ onTaskSubmitted, className }: TaskDelegationProps) {
  // Form state
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [timeout, setTimeout] = useState<number>(30000);
  const [llmProvider, setLlmProvider] = useState<string>('');

  // Task execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<{
    id: string;
    status: 'queued' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
    message: string;
  } | null>(null);

  // Error/Success messages
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Available agents
  const agents = [
    { id: 'data-integrity', name: 'Data Integrity Validator', description: 'Validates data consistency and integrity' },
    { id: 'time-planning', name: 'Time Planning Agent', description: 'Plans and optimizes time allocation' },
    { id: 'tasks-organization', name: 'Tasks Organization Agent', description: 'Organizes and categorizes tasks' },
    { id: 'prepare-classes', name: 'Prepare Classes Agent', description: 'Prepares and structures class data' },
    { id: 'marketing', name: 'Marketing Agent', description: 'Generates marketing content and strategies' },
    { id: 'data-analysis', name: 'Data Analysis Agent', description: 'Analyzes data patterns and insights' },
    { id: 'game-design', name: 'Game Design Agent', description: 'Assists with game design decisions' },
  ];

  // Task types based on agent
  const taskTypes = [
    { id: 'validation', name: 'Data Validation', description: 'Validate data consistency' },
    { id: 'planning', name: 'Planning', description: 'Plan tasks and schedules' },
    { id: 'organization', name: 'Organization', description: 'Organize and categorize' },
    { id: 'preparation', name: 'Preparation', description: 'Prepare data and structures' },
    { id: 'analysis', name: 'Analysis', description: 'Analyze patterns and insights' },
    { id: 'marketing', name: 'Marketing', description: 'Generate marketing content' },
    { id: 'design', name: 'Design', description: 'Design decisions and suggestions' },
  ];

  // Parameters based on task type
  const getParametersForTaskType = (type: string) => {
    switch (type) {
      case 'validation':
        return [
          { name: 'validationType', label: 'Validation Type', type: 'select', options: ['link-consistency', 'data-integrity', 'format-validation'] },
          { name: 'targetEntities', label: 'Target Entities', type: 'text', placeholder: 'Entity IDs (comma-separated)' },
        ];
      case 'planning':
        return [
          { name: 'planningType', label: 'Planning Type', type: 'select', options: ['sprint', 'weekly', 'monthly'] },
          { name: 'timeframe', label: 'Timeframe', type: 'date' },
          { name: 'constraints', label: 'Constraints', type: 'textarea', placeholder: 'Any constraints or requirements' },
        ];
      case 'organization':
        return [
          { name: 'organizationType', label: 'Organization Type', type: 'select', options: ['categorization', 'prioritization', 'grouping'] },
          { name: 'entities', label: 'Entities to Organize', type: 'text', placeholder: 'Entity IDs (comma-separated)' },
        ];
      case 'analysis':
        return [
          { name: 'analysisType', label: 'Analysis Type', type: 'select', options: ['trend-analysis', 'comparative-analysis', 'predictive-analysis'] },
          { name: 'dataRange', label: 'Data Range', type: 'text', placeholder: 'Date range or filters' },
        ];
      case 'marketing':
        return [
          { name: 'contentType', label: 'Content Type', type: 'select', options: ['blog-post', 'social-media', 'email-campaign', 'product-description'] },
          { name: 'targetAudience', label: 'Target Audience', type: 'text', placeholder: 'Target audience description' },
          { name: 'tone', label: 'Tone', type: 'select', options: ['professional', 'casual', 'enthusiastic', 'educational'] },
        ];
      case 'design':
        return [
          { name: 'designType', label: 'Design Type', type: 'select', options: ['game-mechanics', 'level-design', 'character-design', 'ui-design'] },
          { name: 'context', label: 'Context', type: 'textarea', placeholder: 'Design context and requirements' },
        ];
      default:
        return [];
    }
  };

  // Handle parameter change
  const handleParameterChange = (name: string, value: any) => {
    setParameters({ ...parameters, [name]: value });
  };

  // Validate form
  const isFormValid = () => {
    return selectedAgent && taskType && Object.keys(parameters).length > 0;
  };

  // Handle task submission
  const handleSubmitTask = async () => {
    if (!isFormValid()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/pixelbrain/agents/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-jwt-token',
        },
        body: JSON.stringify({
          agentName: selectedAgent,
          task: {
            type: taskType as any,
            priority,
            parameters,
            context: {
              system: 'thegame',
              userId: 'user-123',
            },
          },
          options: {
            timeout,
            llmProvider: llmProvider || undefined,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentTask({
          id: data.taskId,
          status: data.status,
          message: 'Task submitted successfully',
        });
        setSuccessMessage('Task delegated successfully!');
        onTaskSubmitted?.(data.taskId);
      } else {
        setErrorMessage(data.error || 'Task delegation failed');
      }
    } catch (error) {
      setErrorMessage('Failed to delegate task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedAgent('');
    setTaskType('');
    setParameters({});
    setPriority('medium');
    setTimeout(30000);
    setLlmProvider('');
    setCurrentTask(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Get task status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline" className="border-blue-600 text-blue-600"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="border-blue-600 text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-gray-600 text-gray-600"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get task parameter fields
  const parameterFields = taskType ? getParametersForTaskType(taskType) : [];

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Delegate Task to pixelbrain Agent</CardTitle>
          <CardDescription>
            Configure and submit tasks to AI agents for processing and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error/Success Messages */}
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

          {/* Agent Selection */}
          <div className="space-y-2">
            <Label htmlFor="agent">Select Agent *</Label>
            <select
              id="agent"
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setTaskType('');
                setParameters({});
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {selectedAgent && (
              <p className="text-sm text-muted-foreground">
                {agents.find(a => a.id === selectedAgent)?.description}
              </p>
            )}
          </div>

          {/* Task Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="taskType">Task Type *</Label>
            <select
              id="taskType"
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value);
                setParameters({});
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={!selectedAgent}
            >
              <option value="">Choose a task type...</option>
              {taskTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {taskType && (
              <p className="text-sm text-muted-foreground">
                {taskTypes.find(t => t.id === taskType)?.description}
              </p>
            )}
          </div>

          {/* Task Parameters */}
          {parameterFields.length > 0 && (
            <div className="space-y-4">
              <Label>Task Parameters *</Label>
              {parameterFields.map((param) => (
                <div key={param.name} className="space-y-2">
                  <Label htmlFor={param.name}>{param.label}</Label>
                  {param.type === 'select' ? (
                    <select
                      id={param.name}
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select...</option>
                      {param.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : param.type === 'textarea' ? (
                    <textarea
                      id={param.name}
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      placeholder={param.placeholder}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ) : param.type === 'date' ? (
                    <Input
                      id={param.name}
                      type="date"
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={param.name}
                      type={param.type}
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      placeholder={param.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Task Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llmProvider">LLM Provider (Optional)</Label>
              <select
                id="llmProvider"
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Default</option>
                <option value="groq">Groq AI</option>
                <option value="zai">Z AI</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
          </div>

          {/* Current Task Status */}
          {currentTask && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(currentTask.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Current Task</p>
                    {getStatusBadge(currentTask.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{currentTask.message}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Task ID: {currentTask.id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || !!currentTask}
            >
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimated Cost: $0.00 - $0.10
            </div>
            <Button
              onClick={handleSubmitTask}
              disabled={!isFormValid() || isSubmitting || !!currentTask}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Delegate Task
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
