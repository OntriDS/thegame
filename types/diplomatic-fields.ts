// Diplomatic Fields System Configuration
// For detailed explanation, see: .cursor/diplomatic-fields-system.md

import { EntityType } from './enums';

export type FieldType = 'native' | 'ambassador' | 'emissary';

export interface DiplomaticField {
  name: string;
  fieldType: FieldType;
  belongsTo: EntityType;
  sourceEntity: EntityType;
  displayInModal: boolean;
  displayInParentUI: boolean;
  createsLink?: boolean;
  linkType?: string;
  userConfigurable?: boolean;
}

export interface DiplomaticFieldsConfig {
  entityType: EntityType;
  nativeFields: DiplomaticField[];
  ambassadorFields: DiplomaticField[];
  emissaryFields: DiplomaticField[];
}

// TASK ENTITY CONFIGURATION
export const TASK_FIELDS_CONFIG: DiplomaticFieldsConfig = {
  entityType: 'task' as EntityType,
  
  nativeFields: [
    { name: 'name', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'description', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'type', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'status', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'priority', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'progress', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'dueDate', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'station', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'category', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'parentId', fieldType: 'native', belongsTo: 'task' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false }
  ],
  
  ambassadorFields: [
    { name: 'siteId', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'site' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_SITE', userConfigurable: false },
    { name: 'targetSiteId', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'site' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_SITE', userConfigurable: false },
    { name: 'cost', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_FINREC', userConfigurable: false },
    { name: 'revenue', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_FINREC', userConfigurable: false },
    { name: 'isNotPaid', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_FINREC', userConfigurable: false },
    { name: 'isNotCharged', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_FINREC', userConfigurable: false },
    { name: 'rewards.points', fieldType: 'ambassador', belongsTo: 'task' as EntityType, sourceEntity: 'player' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'TASK_PLAYER', userConfigurable: false }
  ],
  
  emissaryFields: [
    { name: 'outputItemType', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputItemSubType', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputQuantity', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputUnitCost', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputItemName', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputItemCollection', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'outputItemPrice', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'isNewItem', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true },
    { name: 'isSold', fieldType: 'emissary', belongsTo: 'task' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'TASK_ITEM', userConfigurable: true }
  ]
};

// FINANCIAL RECORD ENTITY CONFIGURATION
export const FINREC_FIELDS_CONFIG: DiplomaticFieldsConfig = {
  entityType: 'financial' as EntityType,
  
  nativeFields: [
    { name: 'name', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'description', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'year', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'month', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'station', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'category', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'type', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'cost', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'revenue', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'jungleCoins', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'netCashflow', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'notes', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'isNotPaid', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'isNotCharged', fieldType: 'native', belongsTo: 'financial' as EntityType, sourceEntity: 'financial' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false }
  ],
  
  ambassadorFields: [
    { name: 'siteId', fieldType: 'ambassador', belongsTo: 'financial' as EntityType, sourceEntity: 'site' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'FINREC_SITE', userConfigurable: false },
    { name: 'targetSiteId', fieldType: 'ambassador', belongsTo: 'financial' as EntityType, sourceEntity: 'site' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'FINREC_SITE', userConfigurable: false },
    { name: 'rewards.points', fieldType: 'ambassador', belongsTo: 'financial' as EntityType, sourceEntity: 'player' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'FINREC_PLAYER', userConfigurable: false }
  ],
  
  emissaryFields: [
    { name: 'outputItemType', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputItemSubType', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputQuantity', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputUnitCost', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputItemName', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputItemCollection', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'outputItemPrice', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'isNewItem', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true },
    { name: 'isSold', fieldType: 'emissary', belongsTo: 'financial' as EntityType, sourceEntity: 'item' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'FINREC_ITEM', userConfigurable: true }
  ]
};

// SALE ENTITY CONFIGURATION
export const SALE_FIELDS_CONFIG: DiplomaticFieldsConfig = {
  entityType: 'sale' as EntityType,
  
  nativeFields: [
    { name: 'name', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'description', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'saleDate', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'type', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'status', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'lines', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'payments', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'totals', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'overallDiscount', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'isNotPaid', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'isNotCharged', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false },
    { name: 'counterpartyName', fieldType: 'native', belongsTo: 'sale' as EntityType, sourceEntity: 'sale' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: false }
  ],
  
  ambassadorFields: [
    { name: 'siteId', fieldType: 'ambassador', belongsTo: 'sale' as EntityType, sourceEntity: 'site' as EntityType, displayInModal: true, displayInParentUI: true, createsLink: true, linkType: 'SALE_SITE', userConfigurable: false }
  ],
  
  emissaryFields: [
    { name: 'requiresReconciliation', fieldType: 'emissary', belongsTo: 'sale' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'SALE_TASK', userConfigurable: true },
    { name: 'reconciliationTaskId', fieldType: 'emissary', belongsTo: 'sale' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'SALE_TASK', userConfigurable: true },
    { name: 'requiresRestock', fieldType: 'emissary', belongsTo: 'sale' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'SALE_TASK', userConfigurable: true },
    { name: 'restockTaskId', fieldType: 'emissary', belongsTo: 'sale' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'SALE_TASK', userConfigurable: true },
    { name: 'createdTaskId', fieldType: 'emissary', belongsTo: 'sale' as EntityType, sourceEntity: 'task' as EntityType, displayInModal: true, displayInParentUI: false, createsLink: true, linkType: 'SALE_TASK', userConfigurable: true }
  ]
};

// CONFIGURATION ARRAY
export const DIPLOMATIC_FIELDS_CONFIG: DiplomaticFieldsConfig[] = [
  TASK_FIELDS_CONFIG,
  FINREC_FIELDS_CONFIG,
  SALE_FIELDS_CONFIG,
];

// UTILITY FUNCTIONS
export function getDiplomaticConfig(entityType: EntityType): DiplomaticFieldsConfig | undefined {
  return DIPLOMATIC_FIELDS_CONFIG.find(config => config.entityType === entityType);
}

export function getNativeFields(entityType: EntityType): DiplomaticField[] {
  const config = getDiplomaticConfig(entityType);
  return config?.nativeFields || [];
}

export function getAmbassadorFields(entityType: EntityType): DiplomaticField[] {
  const config = getDiplomaticConfig(entityType);
  return config?.ambassadorFields || [];
}

export function getEmissaryFields(entityType: EntityType): DiplomaticField[] {
  const config = getDiplomaticConfig(entityType);
  return config?.emissaryFields || [];
}

export function getAllFields(entityType: EntityType): DiplomaticField[] {
  const config = getDiplomaticConfig(entityType);
  if (!config) return [];
  return [
    ...config.nativeFields,
    ...config.ambassadorFields,
    ...config.emissaryFields
  ];
}

export function getFieldConfig(entityType: EntityType, fieldName: string): DiplomaticField | undefined {
  const allFields = getAllFields(entityType);
  return allFields.find(f => f.name === fieldName);
}

export function isNativeField(entityType: EntityType, fieldName: string): boolean {
  return getNativeFields(entityType).some(f => f.name === fieldName);
}

export function isAmbassadorField(entityType: EntityType, fieldName: string): boolean {
  return getAmbassadorFields(entityType).some(f => f.name === fieldName);
}

export function isEmissaryField(entityType: EntityType, fieldName: string): boolean {
  return getEmissaryFields(entityType).some(f => f.name === fieldName);
}

export function shouldDisplayInParentUI(entityType: EntityType, fieldName: string): boolean {
  const field = getFieldConfig(entityType, fieldName);
  return field?.displayInParentUI ?? true;
}

export function getFieldsThatCreateLinks(entityType: EntityType): DiplomaticField[] {
  return getAllFields(entityType).filter(f => f.createsLink);
}

export function getParentUISafeFields(entityType: EntityType): DiplomaticField[] {
  return getAllFields(entityType).filter(f => f.displayInParentUI);
}

export function getModalOnlyFields(entityType: EntityType): DiplomaticField[] {
  return getAllFields(entityType).filter(f => f.displayInModal && !f.displayInParentUI);
}