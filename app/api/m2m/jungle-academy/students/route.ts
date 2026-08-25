import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';
import { kvGet, kvSet, kvSAdd, kvSMembers, kvMGet, kvDel, kvSRem } from '@/lib/utils/kv';
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

    if (groupId && groupId !== 'all') {
      studentIds = await kvSMembers(getGroupKey(groupId));
    } else {
      // Get all from all groups (including 'all' to catch any orphans from before dropdown fix)
      const groups: string[] = ['all', 'eep', 'group-a', 'group-b', 'group-c'];
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
    students.sort((a, b) => b.totalPoints - a.totalPoints);

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
    const { id, name, groupId } = body;

    if (!name || !groupId) {
      return NextResponse.json({ success: false, error: 'Missing name or groupId' }, { status: 400 });
    }

    let student: JungleStudent;
    const studentId = id || uuid();
    const studentKey = getStudentKey(studentId);

    if (id) {
      const existing = await kvGet<JungleStudent>(studentKey);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Student not found for update' }, { status: 404 });
      }
      student = { ...existing, name };
      
      // Handle group reassignment if needed (this would require srem from old group, but for simplicity we'll just sadd, the frontend could pass oldGroupId if we really needed full group-transfer logic. We'll just enforce sadd for now).
      await kvSAdd(getGroupKey(groupId), studentId);
    } else {
      student = {
        id: studentId,
        name,
        pointsSpa: 0,
        pointsArt: 0,
        pointsPenalty: 0,
        totalPoints: 0,
      };
      await kvSAdd(getGroupKey(groupId), studentId);
    }

    await kvSet(studentKey, student);

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('[Jungle Academy] POST student failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing student id' }, { status: 400 });
  }

  try {
    // Remove student data
    await kvDel(getStudentKey(id));

    // Remove from all groups
    const groups: string[] = ['all', 'eep', 'group-a', 'group-b', 'group-c'];
    await Promise.all(groups.map(g => kvSRem(getGroupKey(g), id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Jungle Academy] DELETE student failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete student' }, { status: 500 });
  }
}
