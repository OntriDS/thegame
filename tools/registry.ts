import { execute as getTasks } from './database/get-tasks';
import { execute as getSales } from './database/get-sales';
import { execute as getPlayers } from './database/get-players';
import { execute as getFinancials } from './database/get-financials';
import { execute as getItems } from './database/get-items';
import { execute as getItemsByCategory } from './database/get-items-by-category';
import { execute as getItemCounts } from './database/get-item-counts';
import { execute as getSites } from './database/get-sites';
import { execute as getCharacters } from './database/get-characters';

import { execute as linkConsistency } from './integrity/link-consistency';
import { execute as statusConsistency } from './integrity/status-consistency';
import { execute as monthIndex } from './integrity/month-index';
import { execute as archiveCompleteness } from './integrity/archive-completeness';
import { execute as taskTimelineVsMonthIndex } from './integrity/task-timeline-vs-month-index';
import { execute as completedTasksMissingFromCompletedIndex } from './integrity/completed-tasks-missing-from-completed-index';
import { execute as activeTasksMissingFromActiveIndex } from './integrity/active-tasks-missing-from-active-index';

import { execute as repairActiveIndex } from './repair/repair-active-index';
import { execute as repairCompletedIndex } from './repair/repair-completed-index';
import { execute as repairSummaries } from './repair/repair-summaries';

import { execute as describe } from './summary/describe';

import { execute as patchEntry } from './logs/patch-entry';
import { execute as ensureDone } from './logs/ensure-done';
import { execute as ensureCollected } from './logs/ensure-collected';

import { execute as audit } from './database/audit';

export const toolRegistry = new Map<string, (args: any) => Promise<any>>([
  ['get_tasks', getTasks],
  ['get_sales', getSales],
  ['get_players', getPlayers],
  ['get_financials', getFinancials],
  ['get_items', getItems],
  ['get_items_by_category', getItemsByCategory],
  ['get_item_counts', getItemCounts],
  ['get_sites', getSites],
  ['get_characters', getCharacters],
  ['thegame.integrity.linkConsistency', linkConsistency],
  ['thegame.integrity.statusConsistency', statusConsistency],
  ['thegame.integrity.monthIndex', monthIndex],
  ['thegame.integrity.archiveCompleteness', archiveCompleteness],
  ['thegame.integrity.taskTimelineVsMonthIndex', taskTimelineVsMonthIndex],
  ['thegame.integrity.completedTasksMissingFromCompletedIndex', completedTasksMissingFromCompletedIndex],
  ['thegame.integrity.activeTasksMissingFromActiveIndex', activeTasksMissingFromActiveIndex],
  ['thegame.tasks.repairActiveIndex', repairActiveIndex],
  ['thegame.tasks.repairCompletedIndex', repairCompletedIndex],
  ['thegame.sales.repairSummaries', repairSummaries],
  ['thegame.summary.describe', describe],
  ['thegame.logs.patchEntry', patchEntry],
  ['thegame.logs.ensureDone', ensureDone],
  ['thegame.logs.ensureCollected', ensureCollected],
  ['thegame.database.audit', audit]
]);
