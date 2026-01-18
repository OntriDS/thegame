import { NextResponse } from 'next/server';
import { getItemById, upsertItem } from '@/data-store/datastore';
import { Item, StockPoint } from '@/types/entities';

interface MoveRequest {
    itemId: string;
    toSiteId: string;
    quantity: number;
    fromSiteId?: string; // Optional: if omitted, assumes adding stock (production/purchase)
}

export async function POST(request: Request) {
    try {
        const body: MoveRequest = await request.json();
        const { itemId, toSiteId, quantity, fromSiteId } = body;

        if (!itemId || !toSiteId || quantity === undefined || quantity <= 0) {
            return NextResponse.json(
                { error: 'Missing required fields: itemId, toSiteId, or invalid quantity' },
                { status: 400 }
            );
        }

        // 1. Fetch Item directly from DataStore
        const item = await getItemById(itemId);
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        let updatedStock = [...item.stock];

        // 2. Handle Source Deduction (if fromSiteId is provided)
        if (fromSiteId) {
            const sourceIndex = updatedStock.findIndex(sp => sp.siteId === fromSiteId);
            if (sourceIndex === -1) {
                return NextResponse.json(
                    { error: `Item not found at source site: ${fromSiteId}` },
                    { status: 400 }
                );
            }

            const sourceStock = updatedStock[sourceIndex];
            if (sourceStock.quantity < quantity) {
                return NextResponse.json(
                    { error: `Insufficient quantity at source. Available: ${sourceStock.quantity}, Requested: ${quantity}` },
                    { status: 400 }
                );
            }

            // Deduct or remove
            if (sourceStock.quantity === quantity) {
                updatedStock = updatedStock.filter((_, i) => i !== sourceIndex);
            } else {
                updatedStock[sourceIndex] = {
                    ...sourceStock,
                    quantity: sourceStock.quantity - quantity
                };
            }
        }

        // 3. Handle Destination Addition
        const destIndex = updatedStock.findIndex(sp => sp.siteId === toSiteId);
        if (destIndex >= 0) {
            updatedStock[destIndex] = {
                ...updatedStock[destIndex],
                quantity: updatedStock[destIndex].quantity + quantity
            };
        } else {
            updatedStock.push({
                siteId: toSiteId,
                quantity: quantity
            });
        }

        // 4. Update Item
        const updatedItem: Item = {
            ...item,
            stock: updatedStock,
            updatedAt: new Date()
        };

        // Add flag for workflow logging if it's a move operation
        if (fromSiteId) {
            (updatedItem as any)._movedViaSubmodal = true;
        }

        await upsertItem(updatedItem);

        return NextResponse.json(updatedItem);

    } catch (error) {
        console.error('Failed to move inventory:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
