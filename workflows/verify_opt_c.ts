import { getSaleById } from '../data-store/datastore';
import { calculateBoothFinancials } from './financial-record-utils';

async function test() {
  const saleId = 'a3a5ee99-ed68-433b-9c94-40711586ef98';
  const sale = await getSaleById(saleId);
  if (!sale) {
    console.error('Sale not found');
    return;
  }

  console.log('--- Testing Performance Ledger Split (Option C) ---');
  console.log('Sale ID:', saleId);
  
  const split = await calculateBoothFinancials(sale);
  
  console.log('Record 1 (Akiles Core):');
  console.log('  Revenue (MyItems):', split.myGross);
  console.log('  Cost (MyBoothShare):', split.myBoothCost);
  console.log('  Net 1:', split.myGross - split.myBoothCost);

  console.log('Record 2 (Contract Impact):');
  console.log('  Revenue (MyCommFromAssoc):', split.myCommFromAssoc);
  console.log('  Cost (AssocCommFromMe):', split.assocCommFromMe);
  console.log('  Net 2 (Impact):', split.myCommFromAssoc - split.assocCommFromMe);

  console.log('--------------------------------------------------');
  console.log('Combined Net (User Profit):', (split.myGross - split.myBoothCost) + (split.myCommFromAssoc - split.assocCommFromMe));
}

test().catch(console.error);
