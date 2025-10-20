// app/api/backups/route.ts
// Backup Management API for KV-only architecture

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { requireAdminAuth } from '@/lib/api-auth';
import { EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Centralized list of entity types that support backups
const BACKUPABLE_ENTITY_TYPES = [
  EntityType.TASK,
  EntityType.ITEM,
  EntityType.SALE,
  EntityType.FINANCIAL,
  EntityType.CHARACTER,
  EntityType.PLAYER,
  EntityType.SITE
];

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityType, data } = await req.json();

    if (!entityType || !data) {
      return NextResponse.json({ 
        error: 'Missing required fields: entityType and data' 
      }, { status: 400 });
    }

    // Validate entity type
    if (!BACKUPABLE_ENTITY_TYPES.includes(entityType as EntityType)) {
      return NextResponse.json({ 
        error: `Invalid entity type. Must be one of: ${BACKUPABLE_ENTITY_TYPES.join(', ')}` 
      }, { status: 400 });
    }

    // Save backup to KV with backup: prefix
    const backupKey = `backup:${entityType}`;
    const backupData = {
      entityType,
      data,
      metadata: {
        savedAt: new Date().toISOString(),
        count: Array.isArray(data) ? data.length : (data[entityType]?.length || 0),
        version: '1.0'
      }
    };

    await kv.set(backupKey, JSON.stringify(backupData));

    console.log(`[Backup API] ✅ Saved backup for ${entityType} (${backupData.metadata.count} items)`);

    return NextResponse.json({
      success: true,
      message: `Successfully saved backup for ${entityType}`,
      data: {
        entityType,
        count: backupData.metadata.count,
        savedAt: backupData.metadata.savedAt
      }
    });

  } catch (error) {
    console.error('[Backup API] Error saving backup:', error);
    return NextResponse.json(
      { error: 'Failed to save backup' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entity');

    // If specific entity requested
    if (entityType) {
      const backupKey = `backup:${entityType}`;
      const backupData = await kv.get(backupKey);

      if (!backupData) {
        return NextResponse.json({ 
          error: `No backup found for entity type: ${entityType}` 
        }, { status: 404 });
      }

      const parsed = JSON.parse(backupData as string);
      return NextResponse.json({
        success: true,
        data: parsed
      });
    }

    // List all available backups
    const backups = [];

    for (const entityType of BACKUPABLE_ENTITY_TYPES) {
      try {
        const backupKey = `backup:${entityType}`;
        const backupData = await kv.get(backupKey);

        if (backupData) {
          const parsed = JSON.parse(backupData as string);
          backups.push({
            entityType,
            count: parsed.metadata.count,
            lastUpdated: parsed.metadata.savedAt,
            version: parsed.metadata.version
          });
        }
      } catch (error) {
        console.warn(`[Backup API] Failed to read backup for ${entityType}:`, error);
      }
    }

    console.log(`[Backup API] ✅ Found ${backups.length} available backups`);

    return NextResponse.json({
      success: true,
      data: {
        backups,
        total: backups.length
      }
    });

  } catch (error) {
    console.error('[Backup API] Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}
