
import { getAllContracts } from '@/data-store/datastore';

async function main() {
    console.log('--- START DEBUG ---');
    const contracts = await getAllContracts();
    console.log(`Found ${contracts.length} contracts.`);

    const target = contracts.find(c => c.name?.includes('O2') || c.counterpartyBusinessId?.includes('O2'));

    if (target) {
        console.log('FOUND CONTRACT:');
        console.log(JSON.stringify(target, null, 2));

        // Explicit Validation
        if (!target.clauses) {
            console.log('❌ CRITICAL: clauses property is MISSING!');
        } else if (!Array.isArray(target.clauses)) {
            console.log('❌ CRITICAL: clauses is NOT an array!');
        } else {
            console.log(`✅ Clauses array exists with length: ${target.clauses.length}`);
            target.clauses.forEach((c, i) => {
                console.log(`   [${i}] Type: ${c.type}, CompanyShare: ${c.companyShare}, AssociateShare: ${c.associateShare}`);
            });
        }

    } else {
        console.log('❌ Contract not found matching "O2"');
        console.log('Available Names:', contracts.map(c => c.name));
    }
    console.log('--- END DEBUG ---');
}

main().catch(console.error);
