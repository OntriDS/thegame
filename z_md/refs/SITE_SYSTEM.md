# SITE SYSTEM - COMPREHENSIVE DOCUMENTATION

**Status**: ✅ **Core Complete** | **Version**: 1.0 | **Date**: January 15, 2025

## SYSTEM OVERVIEW

The Site System manages all business locations and geographic territories in TheGame. It serves as the foundation for the **Map Strategy System** where Sites represent specific business locations (map pins) and Settlements represent areas of influence (territories).

## CORE CONCEPT: MAP STRATEGY SYSTEM

### The Vision
Transform business management into a **strategy game map** where:
- **Sites** = Map pins (specific business locations)
- **Settlements** = Areas of influence (unlocked territories)
- **Google Maps** = Real-world visualization layer
- **Strategy Game Feel** = Territory control and business expansion

### Business Logic
- **Sites** are tied to **Settlements** through ambassador fields
- **Settlements** define areas of business influence
- **Google Maps** provides real-world visualization
- **Territory Control** = Business expansion strategy

## ARCHITECTURE

### Site Entity (Core Entity)
```typescript
interface Site extends BaseEntity {
  name: string;
  description?: string;
  metadata: SiteMetadata;
  isActive: boolean;
  status: string;
  links: Link[];
}
```

### Site Types
1. **Physical Sites**: Real-world locations with geographic data
2. **Cloud Sites**: Digital storage and services
3. **Special Sites**: System-managed locations

### Site Metadata Structure
```typescript
// Physical Sites (with Settlement relationship)
interface PhysicalSiteMetadata extends BaseSiteMetadata {
  type: SiteType.PHYSICAL;
  businessType: PhysicalBusinessType;
  settlementId: string;           // Reference to Settlement entity
  googleMapsAddress: string;      // For Google Maps integration
  coordinates?: { lat: number; lng: number };
}

// Cloud Sites (digital only)
interface CloudSiteMetadata extends BaseSiteMetadata {
  type: SiteType.CLOUD;
  digitalType: CloudSiteType;
  url?: string;
}

// Special Sites (system-managed)
interface SpecialSiteMetadata extends BaseSiteMetadata {
  type: SiteType.SPECIAL;
  purpose: SpecialSiteType;
}
```

## SETTLEMENT SYSTEM (Sub-Entity)

### Settlement Entity
Settlements are **sub-entities** that belong to the Site system but are not core entities. They represent areas of influence and business territories.

```typescript
interface Settlement {
  id: string;
  name: string;
  description?: string;
  country: string;               // Derived from Google Maps
  region: string;               // Derived from Google Maps
  googlePlaceId?: string;       // For Google Maps integration
  coordinates?: { lat: number; lng: number };
  influenceRadius?: number;     // For area of influence visualization
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Settlement Purpose
- **Areas of Influence**: Define business territories
- **Territory Control**: Strategy game element
- **Geographic Organization**: Group Sites by settlement
- **Map Visualization**: Territory boundaries and influence areas

## CURRENT IMPLEMENTATION STATUS

### ✅ COMPLETE
- Site entity with metadata structure
- Site API routes (CRUD operations)
- Site modal with settlement dropdown
- Site logging system
- Site-entity relationships via Links

### ⚠️ PARTIALLY COMPLETE
- **Settlement System**: Currently hardcoded enum, needs dynamic CRUD
- **Google Maps Integration**: Missing coordinates and Place ID support
- **Map Visualization**: Placeholder implementation

### ❌ NOT IMPLEMENTED
- Settlement CRUD operations
- Google Maps API integration
- Territory visualization
- Area of influence mapping

## BUSINESS RULES

### Site-Settlement Relationship
1. **Physical Sites** must have a `settlementId` (ambassador field)
2. **Settlements** can have multiple Sites
3. **Settlement deletion** should prompt about Sites using it
4. **Site creation** can create new Settlements on-the-fly

### Geographic Hierarchy
```
Continent → Country → Region → Settlement → Sites
```

### Google Maps Integration
- **Sites** = Map pins with specific coordinates
- **Settlements** = Territory areas with influence radius
- **Real-world visualization** = Google Maps with custom layers

## DIPLOMATIC FIELDS PATTERN

### Site Fields
- **Native Fields**: name, description, type, status, isActive
- **Ambassador Fields**: settlementId (creates SITE_SETTLEMENT link)
- **Emissary Fields**: None (Sites don't create other entities)

### Settlement Fields
- **Native Fields**: name, description, country, region, coordinates
- **Ambassador Fields**: None (Settlements are referenced by Sites)
- **Emissary Fields**: None (Settlements don't create other entities)

## LINK RELATIONSHIPS

### Site Links
- **SITE_TASK**: Tasks performed at this site
- **SITE_ITEM**: Items stored at this site
- **SITE_SALE**: Sales made at this site
- **SITE_FINREC**: Financial records for this site
- **SITE_CHARACTER**: Characters associated with this site
- **SITE_SETTLEMENT**: Site belongs to settlement (new)

### Settlement Links
- **SETTLEMENT_SITE**: Settlement contains sites (new)

## IMPLEMENTATION ROADMAP

### Phase 1: Settlement CRUD System
1. **Backup Current System**
   - Export hardcoded settlements to migration file
   - Document current settlement usage

2. **Create Settlement Entity**
   - Add Settlement interface to `types/entities.ts`
   - Create settlement repository in `data-store/repositories/`
   - Add settlement API routes

3. **Settings Integration**
   - Add Settlement management to Settings section
   - CRUD operations for settlements

4. **Site Modal Updates**
   - Replace hardcoded settlement dropdown with dynamic one
   - Add settlement creation from Site modal

### Phase 2: Google Maps Integration
1. **Add Coordinates Support**
   - Add lat/lng to Settlement and Site entities
   - Google Maps API integration
   - Place ID support

2. **Map Visualization**
   - Site pins on Google Maps
   - Settlement territory visualization
   - Area of influence mapping

### Phase 3: Advanced Features
1. **Territory Control**
   - Settlement influence radius
   - Business expansion tracking
   - Territory unlocking system

2. **Strategy Game Elements**
   - Territory control visualization
   - Business expansion metrics
   - Geographic business analysis

## TECHNICAL IMPLEMENTATION

### Current Files
- `types/entities.ts` - Site entity definition
- `types/enums.ts` - Hardcoded Settlement enum
- `components/modals/site-modal.tsx` - Site creation/editing
- `app/api/sites/` - Site API routes
- `data-store/repositories/site.repo.ts` - Site repository

### New Files Needed
- `types/settlement.ts` - Settlement entity definition
- `app/api/settlements/` - Settlement API routes
- `data-store/repositories/settlement.repo.ts` - Settlement repository
- `components/settings/settlement-management.tsx` - Settlement CRUD UI

### Migration Strategy
1. **Export hardcoded settlements** to migration file
2. **Create Settlement entities** from hardcoded data
3. **Update Site entities** to use settlementId instead of settlement string
4. **Update UI components** to use dynamic settlements
5. **Remove hardcoded references** after migration

## KEY BENEFITS

### Business Value
- **Territory Control**: Visualize business expansion
- **Geographic Organization**: Group Sites by settlement
- **Strategic Planning**: Territory-based business decisions
- **Real-world Integration**: Google Maps visualization

### Technical Value
- **Dynamic Management**: User-creatable settlements
- **Scalable Architecture**: Support for unlimited settlements
- **Google Integration**: Real-world mapping capabilities
- **Strategy Game Feel**: Engaging business management

## CURRENT LIMITATIONS

1. **Hardcoded Settlements**: Can't add new settlements
2. **No Google Integration**: Missing coordinates and Place ID
3. **No Territory Visualization**: Can't see areas of influence
4. **Static Categories**: Settlement categories are hardcoded

## FUTURE ENHANCEMENTS

1. **Territory Analytics**: Business performance by settlement
2. **Expansion Tracking**: Territory growth over time
3. **Competitive Analysis**: Settlement-based market analysis
4. **Multiplayer Support**: Territory sharing and collaboration

---

**Next Steps**: Implement Settlement CRUD system to enable dynamic territory management and prepare for Google Maps integration.
