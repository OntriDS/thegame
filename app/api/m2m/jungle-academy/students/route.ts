import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';
import { kvGet, kvSet, kvSAdd, kvSMembers, kvMGet } from '@/lib/utils/kv';
import { JungleStudent, JungleGroupId } from '@/types/jungle-academy';

export const dynamic = 'force-dynamic';

const NAMESPACE = 'ecosystem:classes:academy:jungle';

function getStudentKey(id: string) {
  return `${NAMESPACE}:student:${id}`;
}

function getGroupKey(groupId: string) {
  return `${NAMESPACE}:group:${groupId}`;
}

export async function GET(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  try {
    let studentIds: string[] = [];

    if (groupId) {
      studentIds = await kvSMembers(getGroupKey(groupId));
    } else {
      // Get all from all groups
      const groups: JungleGroupId[] = ['eep', 'group-a', 'group-b', 'group-c'];
      const allMembers = await Promise.all(groups.map(g => kvSMembers(getGroupKey(g))));
      studentIds = Array.from(new Set(allMembers.flat()));
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    const keys = studentIds.map(getStudentKey);
    const studentsRaw = await kvMGet<JungleStudent>(keys);
    const students = studentsRaw.filter((s): s is JungleStudent => s !== null);

    // Sort by points descending
    students.sort((a, b) => b.points - a.points);

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('[Jungle Academy] GET students failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, groupId } = body;

    if (!name || !groupId) {
      return NextResponse.json({ success: false, error: 'Missing name or groupId' }, { status: 400 });
    }

    const id = uuid();
    const student: JungleStudent = {
      id,
      name,
      points: 0,
    };

    await kvSet(getStudentKey(id), student);
    await kvSAdd(getGroupKey(groupId), id);

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('[Jungle Academy] POST student failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}
