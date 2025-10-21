import { TaskType, EntityType } from '@/types/enums';
import { Box, Boxes, Brush, CheckSquare, Cpu, CircleDollarSign, FilePlus, FileText, Package, Receipt, Scan ,ShoppingCart, Target, Truck, Award, Trophy, Gamepad, Bolt, Anvil, CalendarSync, AlarmCheck, MapPin, Folder, Zap, BarChart3, DollarSign, Coins, User } from 'lucide-react';

export const TASK_TYPE_ICONS: Record<TaskType, React.ElementType> = {
  [TaskType.GOAL]: Target,
  [TaskType.MILESTONE]: Award,
  [TaskType.MISSION]: Trophy,
  [TaskType.ASSIGNMENT]: CheckSquare,
  [TaskType.RECURRENT_PARENT]: CalendarSync,
  [TaskType.RECURRENT_TEMPLATE]: Anvil,
  [TaskType.RECURRENT_INSTANCE]: AlarmCheck,
};

export const ITEM_TYPE_ICONS: Record<string, React.ElementType> = {
  digital: Cpu,
  artwork: Brush,
  print: FilePlus,
  sticker: Box,
  'sticker bundle': Boxes,
  merch: ShoppingCart,
  material: Package,
  equipment: Truck,
  default: Package,
};

export const FINANCIAL_ENTRY_ICONS: Record<EntityType, React.ElementType> = {
  task: FileText,
  financial: Receipt,
  item: Bolt,
  character: User,
  sale: ShoppingCart,
  site: MapPin,
  player: Gamepad,
  account: User,
};

export const PLAYER_ENTRY_ICON = Gamepad;

// UI Display Icons for log entries
export const LOG_DISPLAY_ICONS = {
  station: Scan,
  financials: CircleDollarSign,
  sites: MapPin,
  default: Zap,
} as const;

// Financial abbreviations
export const FINANCIAL_ABBREVIATIONS = {
  QUANTITY: 'Q',
  COST: 'C',
  REVENUE: 'R', 
  PROFIT: 'P',
  MARGIN: 'M'  
} as const;
