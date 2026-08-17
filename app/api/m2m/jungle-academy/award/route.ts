import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';
import { kvGet, kvSet, kvLPush } from '@/lib/utils/kv';
import { JungleStudent, JungleClassEvent } from '@/types/jungle-academy';

export const dynamic = 'force-dynamic';

const NAMESPACE = 'ecosystem:classes:academy:jungle';

function getStudentKey(id: string) {
  return `${NAMESPACE}:student:${id}`;
}

function getClassEventKey(id: string) {
  return `${NAMESPACE}:class:${id}`;
}

function getUTCNowISO(): string {
  return new Date().toISOString();
}

function getStudentEventsKey(id: string) {
  return `${NAMESPACE}:student-events:${id}`;
}

export async function POST(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { studentId, className, event, points } = body;

    if (!studentId || !className || !event || points === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const studentKey = getStudentKey(studentId);
    const student = await kvGet<JungleStudent>(studentKey);

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // Update student points
    const pointsNum = Number(points);
    if (className === 'spanish') {
      student.pointsSpa = (student.pointsSpa || 0) + pointsNum;
    } else if (className === 'art') {
      student.pointsArt = (student.pointsArt || 0) + pointsNum;
    }
    student.totalPoints = (student.totalPoints || 0) + pointsNum;
    await kvSet(studentKey, student);

    // Create class event
    const classEvent: JungleClassEvent = {
      id: uuid(),
      studentId,
      className,
      event,
      date: getUTCNowISO(),
      points: pointsNum,
    };
    await kvSet(getClassEventKey(classEvent.id), classEvent);
    await kvLPush(getStudentEventsKey(studentId), classEvent.id);

    return NextResponse.json({ success: true, student, classEvent });
  } catch (error) {
    console.error('[Jungle Academy] POST award failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to award points' }, { status: 500 });
  }
}
