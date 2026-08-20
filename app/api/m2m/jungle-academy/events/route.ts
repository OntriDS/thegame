import { NextRequest, NextResponse } from 'next/server';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';
import { kv, kvMGet, kvGet, kvSet } from '@/lib/utils/kv';
import { JungleClassEvent } from '@/types/jungle-academy';

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
    const { eventId, newReason } = body;

    if (!eventId || !newReason) {
      return NextResponse.json({ success: false, error: 'Missing eventId or newReason' }, { status: 400 });
    }

    const eventKey = getClassEventKey(eventId);
    const existingEvent = await kvGet<JungleClassEvent>(eventKey);

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = { ...existingEvent, event: newReason };
    await kvSet(eventKey, updatedEvent);

    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('[Jungle Academy] PATCH event failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
  }
}
