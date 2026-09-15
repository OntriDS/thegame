import { NextRequest, NextResponse } from 'next/server';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';
import { kv, kvMGet, kvGet, kvSet, kvDel, kvLRem } from '@/lib/utils/kv';
import { JungleClassEvent, JungleStudent } from '@/types/jungle-academy';

export const dynamic = 'force-dynamic';

const NAMESPACE = 'ecosystem:classes:academy:jungle';

function getStudentEventsKey(id: string) {
  return `${NAMESPACE}:student-events:${id}`;
}

function getClassEventKey(id: string) {
  return `${NAMESPACE}:class:${id}`;
}

export async function GET(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ success: false, error: 'Missing studentId' }, { status: 400 });
  }

  try {
    const eventsKey = getStudentEventsKey(studentId);
    
    // Fetch all event IDs (or we could paginate, but for now we fetch all)
    // lrange(key, 0, -1) fetches all items in a list in Redis
    const eventIds = await kv.lrange(eventsKey, 0, -1);

    if (!eventIds || eventIds.length === 0) {
      return NextResponse.json({ success: true, events: [] });
    }

    const eventKeys = eventIds.map(id => getClassEventKey(id));
    const eventsRaw = await kvMGet<JungleClassEvent>(eventKeys);
    
    const events = eventsRaw.filter((e): e is JungleClassEvent => e !== null);

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('[Jungle Academy] GET events failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventId, newReason, newClassName } = body;

    if (!eventId || (!newReason && !newClassName)) {
      return NextResponse.json({ success: false, error: 'Missing eventId or nothing to update' }, { status: 400 });
    }

    const eventKey = getClassEventKey(eventId);
    const existingEvent = await kvGet<JungleClassEvent>(eventKey);

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = { ...existingEvent };
    if (newReason) updatedEvent.event = newReason;

    if (newClassName && newClassName !== existingEvent.className) {
      updatedEvent.className = newClassName;

      const studentKey = `${NAMESPACE}:student:${existingEvent.studentId}`;
      const student = await kvGet<JungleStudent>(studentKey);

      if (student) {
        const pointsNum = existingEvent.points;
        // Revert old class
        if (existingEvent.className === 'spanish') {
          student.pointsSpa = (student.pointsSpa || 0) - pointsNum;
        } else if (existingEvent.className === 'art') {
          student.pointsArt = (student.pointsArt || 0) - pointsNum;
        } else if (existingEvent.className === 'penalty') {
          student.pointsPenalty = (student.pointsPenalty || 0) - Math.abs(pointsNum);
        }

        // Apply new class
        if (newClassName === 'spanish') {
          student.pointsSpa = (student.pointsSpa || 0) + pointsNum;
        } else if (newClassName === 'art') {
          student.pointsArt = (student.pointsArt || 0) + pointsNum;
        } else if (newClassName === 'penalty') {
          student.pointsPenalty = (student.pointsPenalty || 0) + Math.abs(pointsNum);
        }
        
        await kvSet(studentKey, student);
      }
    }

    await kvSet(eventKey, updatedEvent);

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('[Jungle Academy] PATCH event failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireProvisioningM2MAuth(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ success: false, error: 'Missing eventId' }, { status: 400 });
  }

  try {
    const eventKey = getClassEventKey(eventId);
    const existingEvent = await kvGet<JungleClassEvent>(eventKey);

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const studentKey = `${NAMESPACE}:student:${existingEvent.studentId}`;
    const student = await kvGet<JungleStudent>(studentKey);

    if (student) {
      const pointsNum = existingEvent.points;
      const className = existingEvent.className;
      if (className === 'spanish') {
        student.pointsSpa = (student.pointsSpa || 0) - pointsNum;
      } else if (className === 'art') {
        student.pointsArt = (student.pointsArt || 0) - pointsNum;
      } else if (className === 'penalty') {
        student.pointsPenalty = (student.pointsPenalty || 0) - Math.abs(pointsNum);
      }
      student.totalPoints = (student.totalPoints || 0) - pointsNum;
      await kvSet(studentKey, student);
    }

    await kvDel(eventKey);
    await kvLRem(getStudentEventsKey(existingEvent.studentId), 0, eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Jungle Academy] DELETE event failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
  }
}
