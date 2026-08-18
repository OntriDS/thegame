import { kvSMembers, kvMGet } from './lib/utils/kv';

async function run() {
  const groups = ['eep', 'group-a', 'group-b', 'group-c'];
  console.log('Fetching groups...');
  const allMembers = await Promise.all(groups.map(g => kvSMembers(`ecosystem:classes:academy:jungle:group:${g}`)));
  console.log('allMembers:', allMembers);
  
  const studentIds = Array.from(new Set(allMembers.flat()));
  console.log('studentIds:', studentIds);
  
  if (studentIds.length > 0) {
    const keys = studentIds.map(id => `ecosystem:classes:academy:jungle:student:${id}`);
    const studentsRaw = await kvMGet(keys);
    console.log('studentsRaw:', studentsRaw);
  }
}

run().catch(console.error);
