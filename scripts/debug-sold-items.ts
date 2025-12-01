
import { getItemsForMonth, getAllItems } from '@/data-store/datastore';
import { formatMonthKey } from '@/lib/utils/date-utils';

async function debugItems() {
    console.log('--- Debugging Items ---');

    // 1. Check November 2025 Index
    const novKey = formatMonthKey(new Date(2025, 10, 1)); // Month is 0-indexed in Date constructor
    console.log(`Checking index for: ${novKey}`);

    try {
        const novItems = await getItemsForMonth(2025, 11); // getItemsForMonth takes 1-indexed month
        console.log(`Found ${novItems.length} items in November 2025 index.`);
        novItems.forEach(i => {
            console.log(`- ${i.name} (${i.id}): Status=${i.status}, SoldAt=${i.soldAt}`);
        });
    } catch (e) {
        console.error('Error fetching November items:', e);
    }

    // 2. Search for specific items globally
    const targetNames = ['El Titi', 'Capo Chino', 'Spider'];
    console.log(`\nSearching globally for: ${targetNames.join(', ')}`);

    try {
        const allItems = await getAllItems();
        const found = allItems.filter(i => targetNames.includes(i.name));

        if (found.length === 0) {
            console.log('No matching items found globally in active storage.');
        } else {
            found.forEach(i => {
                console.log(`FOUND: ${i.name} (${i.id})`);
                console.log(`  Status: ${i.status}`);
                console.log(`  SoldAt: ${i.soldAt}`);
                console.log(`  CreatedAt: ${i.createdAt}`);
                console.log(`  Month Index Key should be: ${i.soldAt ? formatMonthKey(new Date(i.soldAt)) : 'N/A'}`);
            });
        }
    } catch (e) {
        console.error('Error fetching all items:', e);
    }
}

debugItems().catch(console.error);
