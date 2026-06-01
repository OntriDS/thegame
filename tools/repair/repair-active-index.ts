import { repairTaskActiveIndex } from '@/data-store/datastore';
export async function execute(parameters: any) {
  return await repairTaskActiveIndex();
}