import { DevSprintStatus } from '@/types/enums';
import { DEV_SPRINT_STATUS_COLORS } from '@/lib/constants/status-colors';
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';

/**
 * Get the appropriate badge props for a phase status
 */
export const getPhaseStatusBadgeProps = (status: string, phaseKey: string, onCycleStatus: (phaseKey: string) => void, isDarkMode: boolean = false) => {
  const baseClasses = "cursor-pointer hover:opacity-80 transition-opacity w-fit";
  
  switch (status) {
    case DevSprintStatus.DONE: 
      return {
        className: `${isDarkMode ? DEV_SPRINT_STATUS_COLORS[DevSprintStatus.DONE].dark : DEV_SPRINT_STATUS_COLORS[DevSprintStatus.DONE].light} ${baseClasses}`,
        onClick: () => onCycleStatus(phaseKey),
        children: DevSprintStatus.DONE
      };
    case DevSprintStatus.IN_PROGRESS: 
      return {
        className: `${isDarkMode ? DEV_SPRINT_STATUS_COLORS[DevSprintStatus.IN_PROGRESS].dark : DEV_SPRINT_STATUS_COLORS[DevSprintStatus.IN_PROGRESS].light} ${baseClasses}`,
        onClick: () => onCycleStatus(phaseKey),
        children: DevSprintStatus.IN_PROGRESS
      };
    case DevSprintStatus.NOT_STARTED: 
      return {
        variant: "outline" as const,
        className: `${isDarkMode ? DEV_SPRINT_STATUS_COLORS[DevSprintStatus.NOT_STARTED].dark : DEV_SPRINT_STATUS_COLORS[DevSprintStatus.NOT_STARTED].light} ${baseClasses}`,
        onClick: () => onCycleStatus(phaseKey),
        children: DevSprintStatus.NOT_STARTED
      };
    default: 
      return {
        variant: "outline" as const,
        className: `${isDarkMode ? DEV_SPRINT_STATUS_COLORS[DevSprintStatus.NOT_STARTED].dark : DEV_SPRINT_STATUS_COLORS[DevSprintStatus.NOT_STARTED].light} ${baseClasses}`,
        onClick: () => onCycleStatus(phaseKey),
        children: status
      };
  }
};

/**
 * Update phase status via API
 */
export const updatePhaseStatus = async (phaseKey: string, newStatus: string, projectStatus: any) => {
  try {
    const response = await fetch('/api/project-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phaseKey,
        newStatus,
      }),
    });

    if (response.ok) {
      // Log phase completion if status is "Done"
      if (newStatus === DevSprintStatus.DONE) {
        const phaseName = projectStatus.phasePlan[phaseKey].phaseName || projectStatus.phasePlan[phaseKey].name;
        await logPhaseCompletion(phaseKey, phaseName);
      }
    } else {
      console.error('Failed to update phase status');
    }
  } catch (error) {
    console.error('Error updating phase status:', error);
  }
};

/**
 * Log phase completion to dev log
 */
export const logPhaseCompletion = async (phaseKey: string, phaseName: string) => {
  try {
    // Get current date in DD-MM-YYYY format (ALWAYS use this format)
    const currentDate = formatDateDDMMYYYY(new Date());
    
    const response = await fetch('/api/dev-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'phase_completion',
        data: {
          phaseKey,
          phaseName,
          date: currentDate
        }
      }),
    });

    if (!response.ok) {
      console.error('Failed to log phase completion');
    }
  } catch (error) {
    console.error('Error logging phase completion:', error);
  }
};

/**
 * Cycle through phase statuses (Not Started -> In Progress -> Done -> Not Started)
 */
export const cyclePhaseStatus = async (phaseKey: string, projectStatus: any, onUpdateStatus: (phaseKey: string, newStatus: string) => Promise<void>) => {
  const availableStatuses = [DevSprintStatus.NOT_STARTED, DevSprintStatus.IN_PROGRESS, DevSprintStatus.DONE];
  const currentStatus = projectStatus.phasePlan[phaseKey].status;
  const statusIndex = availableStatuses.indexOf(currentStatus);
  const nextStatus = availableStatuses[(statusIndex + 1) % availableStatuses.length];
  
  await onUpdateStatus(phaseKey, nextStatus);
};

/**
 * Get available statuses for phase cycling
 */
export const getAvailableStatuses = () => [DevSprintStatus.NOT_STARTED, DevSprintStatus.IN_PROGRESS, DevSprintStatus.DONE];
