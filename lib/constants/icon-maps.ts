import { TaskType, ItemType, EntityType } from '@/types/enums';
import { Box, Boxes, Brush, CheckSquare, Cpu, CircleDollarSign, FilePlus, FileText, Package, Receipt, Scan ,ShoppingCart, Target, Truck, Award, Trophy, Gamepad, Bolt, Anvil, CalendarSync, AlarmCheck, MapPin, Folder, Zap, BarChart3, DollarSign, Coins, User, Link as LinkIcon, MessageSquare, Building2 } from 'lucide-react';

export const TASK_TYPE_ICONS: Record<TaskType, React.ElementType> = {
  [TaskType.GOAL]: Target,
  [TaskType.MILESTONE]: Award,
  [TaskType.MISSION]: Trophy,
  [TaskType.ASSIGNMENT]: CheckSquare,
  [TaskType.RECURRENT_GROUP]: CalendarSync,
  [TaskType.RECURRENT_TEMPLATE]: Anvil,
  [TaskType.RECURRENT_INSTANCE]: AlarmCheck,
  [TaskType.AUTOMATION]: Zap
};

export const ITEM_TYPE_ICONS: Record<string, React.ElementType> = {
  [ItemType.DIGITAL.toLowerCase()]: Cpu,
  [ItemType.ARTWORK.toLowerCase()]: Brush,
  [ItemType.PRINT.toLowerCase()]: FilePlus,
  [ItemType.STICKER.toLowerCase()]: Box,
  [ItemType.BUNDLE.toLowerCase()]: Boxes,
  [ItemType.MERCH.toLowerCase()]: ShoppingCart,
  [ItemType.MATERIAL.toLowerCase()]: Package,
  [ItemType.EQUIPMENT.toLowerCase()]: Truck,
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
  link: LinkIcon,
  session: MessageSquare,
  settlement: Building2,
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
