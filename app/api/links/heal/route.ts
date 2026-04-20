import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import { getAllFinancials, getTaskById, getSaleById } from '@/data-store/datastore';
import { getLinksFor, createLink } from '@/links/link-registry';
import { EntityType, LinkType } from '@/types/enums';
import { makeLink } from '@/links/links-workflows';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const financials = await getAllFinancials();
    let repairedCount = 0;
    
    for (const fin of financials) {
      if (fin.sourceTaskId) {
        // Find existing links for this financial record
        const finLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: fin.id });
        const hasTaskLink = finLinks.some(l => 
          l.linkType === LinkType.TASK_FINREC &&
          ((l.source.type === EntityType.TASK && l.source.id === fin.sourceTaskId) &&
           (l.target.type === EntityType.FINANCIAL && l.target.id === fin.id))
        );
        
        if (!hasTaskLink) {
           const task = await getTaskById(fin.sourceTaskId);
           if (task) {
             const newLink = makeLink(
               LinkType.TASK_FINREC,
               { type: EntityType.TASK, id: task.id },
               { type: EntityType.FINANCIAL, id: fin.id }
             );
             
             await createLink(newLink, { skipValidation: true }); // Avoid validation loops or canonical rejection issues during repair
             repairedCount++;
             console.log(`[Heal Links] Restored missing TASK_FINREC link: Task ${task.id} <-> Financial ${fin.id}`);

             // Also repair reverse index by calling it from task side
             // createLink already handles `kvSAdd` for both source and target in registry, so just calling it is enough!
           }
        }
      }

      // Heal SALE_FINREC just in case
      if (fin.sourceSaleId) {
        const finLinks = await getLinksFor({ type: EntityType.FINANCIAL, id: fin.id });
        const hasSaleLink = finLinks.some(l => 
          l.linkType === LinkType.SALE_FINREC &&
          ((l.source.type === EntityType.SALE && l.source.id === fin.sourceSaleId) &&
           (l.target.type === EntityType.FINANCIAL && l.target.id === fin.id))
        );
        
        if (!hasSaleLink) {
           const sale = await getSaleById(fin.sourceSaleId);
           if (sale) {
             const newLink = makeLink(
               LinkType.SALE_FINREC,
               { type: EntityType.SALE, id: sale.id },
               { type: EntityType.FINANCIAL, id: fin.id }
             );
             
             await createLink(newLink, { skipValidation: true });
             repairedCount++;
             console.log(`[Heal Links] Restored missing SALE_FINREC link: Sale ${sale.id} <-> Financial ${fin.id}`);
           }
        }
      }
    }
    
    return NextResponse.json({ success: true, repairedCount });
  } catch (error) {
    console.error('[Heal Links] Failed:', error);
    return NextResponse.json({ error: 'Failed to heal links' }, { status: 500 });
  }
}
