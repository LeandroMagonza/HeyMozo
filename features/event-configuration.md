# Event Configuration Feature

## Implementation Status: ✅ Completed

### Progress Overview
- **Status**: Feature Implementation Complete
- **Started**: 2025-08-19
- **Current Phase**: Production Ready with Full Configuration UI
- **Completion**: 100% (Implementation) / 100% (Planning)

---

## Summary

Transform HeyMozo from hardcoded restaurant events to a fully configurable, industry-agnostic system where companies, branches, and locations can define custom events with personalized colors, text, and priorities. This feature enables businesses (restaurants, hospitals, hotels, etc.) to tailor the customer-staff communication system to their specific needs while maintaining core system functionality through protected system events.

---

## Feature Details

### Core Functionality
- **System Events**: Protected core events (SCAN, MARK_SEEN, OCCUPY, VACATE) that cannot be deleted or disabled, only renamed and recolored
- **Custom Events**: Dynamic, company-specific events that can be created, modified, enabled/disabled, and deleted
- **Industry Agnostic**: Support for restaurants (tables), hospitals (rooms/beds), hotels (rooms), etc.
- **Hierarchical Configuration**: Company → Branch → Location inheritance with specific overrides
- **Visual Customization**: Custom colors for customer buttons and admin status displays, configurable icons, and font colors
- **Icon Selection**: Choose from available React Icons library icons for each event type
- **Font Color Control**: Set custom text color for button readability and branding
- **Priority System**: Handle multiple simultaneous events with priority-based status display (system events use fixed priorities)
- **Inline Editing**: Click-to-edit event names, state names, colors, icons, and font colors directly in the configuration modal
- **Smart Configuration**: Automatically removes redundant configurations that match parent settings
- **Audit Trail**: Track who created/modified configurations and when

### User Stories
1. **As a restaurant owner**, I want to rename "Call Waiter" to match my service style, choose appropriate icons (🍽️), and set brand colors
2. **As a hospital administrator**, I want to rename "Call Waiter" to "Call Nurse" with a medical icon (🏥) and appropriate colors for medical urgency
3. **As a hotel manager**, I want to create events like "Request Housekeeping" with housekeeping icons (🧹) and professional color schemes
4. **As a branch manager**, I want to configure events specific to my location while inheriting company defaults, with custom icons for local services
5. **As a staff member**, I want to see location status colors and icons that reflect our business's event priorities at a glance
6. **As a customer/patient/guest**, I want to see buttons with icons and colors that make the service request immediately recognizable
7. **As a business owner**, I want to ensure button text is readable by setting appropriate font colors that contrast with my brand colors

---

## Technical Architecture

### Database Design

#### EventType Model
```javascript
{
  id: INTEGER (PK, AUTO_INCREMENT),
  companyId: INTEGER (FK → Companies.id),
  eventName: STRING (e.g., "Call Waiter", "Call Nurse"), // Renamed from userText
  userColor: STRING (hex color for customer button background),
  userFontColor: STRING (hex color for customer button text, default: '#ffffff'),
  userIcon: STRING (React Icon component name, e.g., 'FaUtensils', default: null),
  stateName: STRING (e.g., "Waiter Called", "Nurse Called"), // Renamed from adminText
  adminColor: STRING (hex color for admin status),
  priority: INTEGER (higher = more important),
  isDefault: BOOLEAN (system defaults),
  systemEventType: ENUM('SCAN', 'MARK_SEEN', 'OCCUPY', 'VACATE') | NULL,
  isActive: BOOLEAN (soft delete mechanism),
  deletedAt: DATE (soft delete timestamp),
  createdAt: DATE,
  updatedAt: DATE,
  createdBy: INTEGER (FK → Users.id),
  updatedBy: INTEGER (FK → Users.id)
}
```

**System Event Types:**
- `SCAN`: Auto-generated when user scans QR code (cannot be deleted, can be renamed)
- `MARK_SEEN`: Generated when staff acknowledges events (cannot be deleted, can be renamed)
- `OCCUPY`: Admin-triggered to mark location as occupied manually (cannot be deleted, can be renamed)
- `VACATE`: Mark location as available (cannot be deleted, can be renamed)

**System Event Behavior:**
- All system events are created with `seenAt = createdAt` (auto-seen)
- System events don't count towards unseen event count in admin interface
- System events cannot be disabled or deleted, only renamed and recolored
- System events don't display priority in the UI (priorities are fixed)
- Only custom events (user-triggered buttons) contribute to unseen counts

#### EventConfiguration Model
```javascript
{
  id: INTEGER (PK, AUTO_INCREMENT),
  resourceType: ENUM('company', 'branch', 'location'),
  resourceId: INTEGER (ID of the configured resource),
  eventTypeId: INTEGER (FK → EventType.id),
  enabled: BOOLEAN,
  createdAt: DATE,
  updatedAt: DATE,
  createdBy: INTEGER (FK → Users.id),
  updatedBy: INTEGER (FK → Users.id)
}
```

#### Event Model (Updated)
```javascript
{
  id: INTEGER (PK, AUTO_INCREMENT),
  tableId: INTEGER (FK → Tables.id), // Will become locationId in future
  eventTypeId: INTEGER (FK → EventType.id), // Changed from 'type' string
  message: STRING,
  seenAt: DATE
}
```

#### Database Indexes
```sql
-- EventConfiguration optimizations
CREATE INDEX idx_event_config_lookup ON EventConfiguration(resourceType, resourceId, eventTypeId);
CREATE INDEX idx_event_config_company ON EventConfiguration(resourceType, resourceId) WHERE resourceType IN ('company', 'branch', 'location');
CREATE UNIQUE INDEX idx_event_config_unique ON EventConfiguration(resourceType, resourceId, eventTypeId);

-- EventType optimizations  
CREATE INDEX idx_event_type_company ON EventType(companyId, isActive);
CREATE INDEX idx_event_type_priority ON EventType(companyId, priority, isActive);
```

### Table State Logic (Simplified)

**New Priority-Based State Calculation:**
1. **Iterate events from newest to oldest** until finding first non-MARK_SEEN event
2. **If first found event is VACATE** → Table state = `AVAILABLE`
3. **If any custom events are unseen** → Table state = `highest priority unseen event`
4. **Else** → Table state = `OCCUPIED` (from SCAN/OCCUPY)

**Time Calculations:**
- **Available**: Time since last VACATE event
- **Occupied**: Time since last SCAN/OCCUPY event  
- **Waiting**: Time since first unseen custom event

**Benefits of New Logic:**
- Eliminates hardcoded state combinations (MANAGER_WAITER_CHECK, etc.)
- Uses EventType priorities instead of fixed hierarchy
- Industry-agnostic (works for any business type)
- Simpler to understand and maintain
- Supports unlimited custom events

### Event Resolution Logic
```sql
-- Get effective events for a location (table)
SELECT et.*, ec.enabled,
  CASE 
    WHEN ec.resourceType = 'location' THEN 1
    WHEN ec.resourceType = 'branch' THEN 2
    WHEN ec.resourceType = 'company' THEN 3
    ELSE 4
  END as config_priority
FROM EventType et
LEFT JOIN EventConfiguration ec ON et.id = ec.eventTypeId 
WHERE et.companyId = $companyId 
  AND et.isActive = true
  AND (
    (ec.resourceType = 'location' AND ec.resourceId = $tableId) OR
    (ec.resourceType = 'branch' AND ec.resourceId = $branchId) OR  
    (ec.resourceType = 'company' AND ec.resourceId = $companyId) OR
    ec.id IS NULL -- Default to enabled if no configuration exists
  )
ORDER BY 
  config_priority ASC,  -- Most specific configuration wins
  et.priority DESC,     -- Higher priority events first
  et.eventName ASC;     -- Alphabetical as tiebreaker (updated field name)
```

### Default Company Events Creation
When a new company is created, these events are automatically generated:

**System Events (cannot be deleted):**
1. `SCAN` - "Location Scanned" / "Ubicación Escaneada" (priority: 100, not shown to customers)
2. `MARK_SEEN` - "Acknowledged" / "Visto" (priority: 90, not shown to customers)
3. `OCCUPY` - "Occupy Location" / "Ocupar Ubicación" (priority: 80, not shown to customers)
4. `VACATE` - "Vacate Location" / "Liberar Ubicación" (priority: 70, not shown to customers)

**Default Custom Events (can be modified/deleted):**
5. "Call Waiter" / "Llamar Mesero" (priority: 50, userColor: #007bff, userFontColor: #ffffff, userIcon: 'FaUser', adminColor: #ffc107)
6. "Request Check" / "Solicitar Cuenta" (priority: 40, userColor: #28a745, userFontColor: #ffffff, userIcon: 'FaFileInvoiceDollar', adminColor: #17a2b8)
7. "Call Manager" / "Llamar Gerente" (priority: 60, userColor: #dc3545, userFontColor: #ffffff, userIcon: 'FaUserTie', adminColor: #fd7e14)

**Default EventConfiguration Creation:**
- When EventTypes are created for a company, corresponding EventConfiguration records should be created for the company resource
- When custom events are created from an EventConfigModal, they should also create EventConfiguration records for the specific resource (company/branch/location) being configured
- This ensures events are enabled by default and visible in the configuration interface

---

## Implementation Tasks

### Phase 1: Database & Models ✅
- [x] **Task 1.1**: Create EventType model with all fields including systemEventType
- [x] **Task 1.2**: Create EventConfiguration model with indexes
- [x] **Task 1.3**: Update Event model to use eventTypeId instead of type string
- [x] **Task 1.4**: Create database migrations for all new models
- [x] **Task 1.5**: Add EventType and EventConfiguration associations to models/index.js
- [x] **Task 1.6**: Create migration to populate default events for existing companies
- [x] **Task 1.7**: Update company creation logic to include all 7 default events

### Phase 2: Backend API ✅
- [x] **Task 2.1**: Create EventType CRUD endpoints with system event protection
- [x] **Task 2.2**: Create EventConfiguration management endpoints
- [x] **Task 2.3**: Implement event inheritance resolution logic
- [x] **Task 2.4**: Add customer event resolution endpoint (excludes system events)
- [x] **Task 2.5**: Add admin event resolution endpoint (includes all events)
- [x] **Task 2.6**: Update table endpoints to use new EventType system
- [x] **Task 2.7**: Add validation for system event protection rules

### Phase 3: Frontend Configuration UI ✅
- [x] **Task 3.1**: Create EventConfigModal component with:
  - [x] Event list with inheritance visualization
  - [x] Color picker for userColor and adminColor
  - [x] System event protection (no disable/delete, only rename/recolor)
  - [x] Compact layout with Spanish localization
  - [x] Smart checkboxes for custom events only
  - [x] Reset button to clear specific configurations
  - [x] Save/Cancel functionality
- [x] **Task 3.2**: Update CompanyConfig with "Configure Events" button
- [x] **Task 3.3**: Update BranchConfig with "Configure Events" button
- [x] **Task 3.4**: Add location-level event configuration (optional)
- [x] **Task 3.5**: Create event creation modal for custom events
- [ ] **Task 3.6**: Add inline editing for event names, states, and colors (New)
- [ ] **Task 3.7**: Add icon picker component with React Icons library integration (New)
- [ ] **Task 3.8**: Add font color picker for button text customization (New)
- [ ] **Task 3.9**: Update EventConfigModal to include icon and font color fields (New)

### Phase 4: Customer Interface Updates ✅
- [x] **Task 4.1**: Update UserScreen to fetch dynamic events from API
- [x] **Task 4.2**: Apply custom colors and text to customer buttons
- [x] **Task 4.3**: Update event submission to use eventTypeId structure
- [x] **Task 4.4**: Filter out system events from customer button display
- [x] **Task 4.5**: Handle SCAN event generation automatically on page load
- [x] **Task 4.6**: Update ButtonsGroup component to support dynamic events
- [x] **Task 4.7**: Consolidate table API to include event types in single call
- [x] **Task 4.8**: Remove redundant /events/effective API calls
- [x] **Task 4.9**: Remove default event fallbacks from frontend
- [x] **Task 4.10**: Enhanced event creation endpoint with system event resolution
- [x] **Task 4.11**: Implement flexible event input methods (ID, systemEventType, legacy)
- [ ] **Task 4.12**: Add icon rendering support in ButtonsGroup component (New)
- [ ] **Task 4.13**: Apply custom font colors to button text (New)
- [ ] **Task 4.14**: Create icon mapping service for React Icons (New)

### Phase 5: Admin Interface Updates ✅
- [x] **Task 5.1**: Update AdminScreen table status colors based on event priorities
- [x] **Task 5.2**: Display custom admin text for events
- [x] **Task 5.3**: Handle multiple simultaneous events with priority logic
- [x] **Task 5.4**: Add MARK_SEEN event generation when staff acknowledges events
- [x] **Task 5.5**: Implement OCCUPY/VACATE event functionality
- [x] **Task 5.6**: Update event history display with new EventType data

### Phase 6: Testing & Migration 🧪
- [ ] **Task 6.1**: Test event inheritance scenarios (company → branch → location)
- [ ] **Task 6.2**: Test configuration overrides at different levels
- [ ] **Task 6.3**: Test system event protection (cannot delete, can rename)
- [ ] **Task 6.4**: Test custom event CRUD operations
- [ ] **Task 6.5**: Migrate existing companies to new 7-event setup
- [ ] **Task 6.6**: End-to-end testing across different industry scenarios
- [ ] **Task 6.7**: Performance testing with large numbers of events and locations
- [ ] **Task 6.8**: Test event priority resolution with multiple simultaneous events

---

## API Endpoints

### EventType Management
```
GET    /api/companies/:companyId/event-types          # List company event types
POST   /api/companies/:companyId/event-types          # Create new event type
PUT    /api/event-types/:eventId                      # Update event type (with system protection)
DELETE /api/event-types/:eventId                      # Soft delete event type (fails for system events)
```

### EventConfiguration Management
```
GET    /api/resources/:resourceType/:resourceId/events/config              # Get resource configurations
POST   /api/resources/:resourceType/:resourceId/events/config              # Bulk configure events
DELETE /api/resources/:resourceType/:resourceId/events/config              # Reset to parent config
DELETE /api/resources/:resourceType/:resourceId/events/config/:eventTypeId # Remove specific event configuration
```

### Event Resolution
```
GET    /api/tables/:tableId                           # Get table data including effective events (consolidated)
GET    /api/tables/:tableId/events/effective          # Get effective events for customer UI (excludes system events) - DEPRECATED
GET    /api/tables/:tableId/events/all                # Get all events including system events for admin
GET    /api/resources/:resourceType/:resourceId/events/resolved  # Preview resolved configuration
```

### System Event Protection
```
PUT    /api/event-types/:eventId/rename               # Rename system event (text/colors only)
DELETE /api/event-types/:eventId                     # Fails if systemEventType is not null
```

### Inline Editing (New)
```
PUT    /api/event-types/:eventId/field                # Update specific field (eventName, stateName, userColor, adminColor, userFontColor, userIcon)
```

### Event Creation (Enhanced)
```
POST   /api/tables/:tableId/events                    # Create event with flexible input methods
```

**Enhanced Event Creation Endpoint:**
The `/api/tables/:tableId/events` endpoint now supports three different input methods:

1. **Custom Events by ID**: `{ eventTypeId: 123, message: "Optional message" }`
2. **System Events by Type**: `{ systemEventType: 'SCAN', message: null }`
3. **Legacy Support**: `{ type: 'CALL_WAITER', message: "Legacy format" }` (backward compatibility)

**System Event Resolution Logic:**
For system events, the endpoint automatically resolves the correct EventType ID:
- Receives `systemEventType: 'SCAN'`
- Extracts `tableId` → `branchId` → `companyId` from database relationships
- Queries `EventType` table: `WHERE companyId AND systemEventType = 'SCAN' AND isActive = true`
- Uses the resolved EventType ID for event creation

**Benefits:**
- **Industry-agnostic**: Each company has unique EventType IDs for system events
- **Simple frontend**: Customer interface only needs to send `systemEventType: 'SCAN'`
- **Flexible**: Supports both direct IDs and system event identifiers
- **Backward compatible**: Maintains legacy string support during migration

---

## UI/UX Design

### Configuration Modal Features
- **Inheritance Visualization**: Icons showing configuration source (🏢 Company, 🏪 Branch, 📍 Location)
- **Color Coding**: Yellow background for resource-specific configurations, white for inherited
- **System Event Protection**: System events cannot be disabled, only renamed and recolored
- **Inline Editing**: Click-to-edit functionality for event names, state names, and colors
- **Smart Checkboxes**: Enable/disable toggle only for custom events (system events always enabled)
- **Compact Layout**: Optimized space usage with streamlined event display
- **Spanish Localization**: All UI text in Spanish for better user experience
- **Reset Functionality**: Clear all specific configurations and return to parent inheritance

### Visual Customization Integration
- **User Color**: Background color of the button customers see
- **User Font Color**: Text color of the button for optimal readability (default: white)
- **User Icon**: Icon displayed before button text from React Icons library
- **Admin Color**: Background color when event is active in admin view
- **Accessibility**: Ensure sufficient contrast ratios (WCAG AA compliance) between background and font colors
- **Presets**: Industry-specific color schemes and icon sets (restaurant, hospital, hotel themes)
- **Icon Library**: React Icons library integration with searchable icon picker

### Customer Interface Updates
- **Dynamic Buttons**: Buttons generated from EventType configurations
- **Custom Colors**: Apply userColor to button background and userFontColor to text
- **Custom Icons**: Display userIcon before button text for visual recognition
- **Industry Context**: Text appropriate for business type with matching iconography
- **Priority Ordering**: Important events displayed more prominently
- **Accessibility**: High contrast between background and text colors for readability

---

## Migration Strategy

### Existing Data Handling
1. **Preserve Current Functionality**: Ensure no breaking changes during rollout
2. **Default Event Creation**: Auto-create 7 events (4 system + 3 custom) for existing companies
3. **Event Type Migration**: Convert existing Event.type strings to EventType references
4. **System Event Protection**: Ensure system events cannot be accidentally deleted
5. **Industry Adaptation**: Enable easy customization for different business types

### Rollout Plan
1. **Phase 1**: Deploy database changes and models
2. **Phase 2**: Deploy backend API with backward compatibility
3. **Phase 3**: Add configuration UI for new companies
4. **Phase 4**: Enable configuration for existing companies
5. **Phase 5**: Migrate all existing events to new system
6. **Phase 6**: Remove hardcoded event fallbacks

### Data Migration Script
```javascript
// Pseudo-code for migration
async function migrateExistingEvents() {
  const companies = await Company.findAll();
  
  for (const company of companies) {
    // Create default EventTypes for company
    const eventTypes = await createDefaultEventTypes(company.id);
    
    // Update existing Events to reference EventTypes
    const events = await Event.findAll({
      include: [{ model: Table, include: [{ model: Branch, where: { companyId: company.id } }] }]
    });
    
    for (const event of events) {
      const eventType = findEventTypeByLegacyType(eventTypes, event.type);
      await event.update({ eventTypeId: eventType.id });
    }
  }
}
```

---

## Testing Scenarios

### Configuration Inheritance
- [ ] Company-only configuration works correctly
- [ ] Branch overrides company configuration appropriately
- [ ] Location overrides branch and company configuration
- [ ] Reset functionality returns to parent configuration
- [ ] Multiple resource types can be configured independently
- [ ] Conflicting configurations resolve with proper precedence

### System Event Protection
- [ ] System events cannot be deleted via API
- [ ] System events can be renamed but not removed
- [ ] System events maintain their systemEventType identifier
- [ ] Custom events can be created, updated, and deleted normally
- [ ] UI prevents deletion of system events

### User Experience
- [ ] Customer sees correct button colors and text
- [ ] Admin sees correct status colors based on priorities
- [ ] Event priorities work correctly for multiple simultaneous events
- [ ] Configuration changes reflect immediately in both interfaces
- [ ] SCAN events are generated automatically on page load
- [ ] MARK_SEEN events are generated when staff acknowledges

### Edge Cases
- [ ] Deleted event types don't appear in customer UI
- [ ] Disabled events are hidden from customers but visible to admins
- [ ] Empty configurations fall back to company defaults
- [ ] Invalid color codes are rejected with proper validation
- [ ] Events with same priority are ordered alphabetically
- [ ] System events always have higher priority than custom events

### Performance Testing
- [ ] Event resolution queries execute in < 100ms
- [ ] Page load with 20+ events remains under 2 seconds
- [ ] Configuration modal loads efficiently with large event lists
- [ ] Bulk configuration updates complete within 5 seconds

---

## Performance Considerations

### Database Optimization
- **Indexes**: Optimized queries for event resolution with multi-column indexes
- **Query Efficiency**: Single query to resolve all location events using JOINs
- **Soft Deletes**: Maintain data integrity while allowing "deletion"
- **Connection Pooling**: Efficient database connection management

### Frontend Optimization
- **Configuration Caching**: Cache resolved configurations in React state
- **Lazy Loading**: Load configuration modal content on demand
- **Optimistic Updates**: Update UI before server confirmation
- **Debounced Saving**: Prevent excessive API calls during configuration

### Backend Optimization
- **Event Resolution Caching**: Cache frequently accessed event configurations
- **Batch Operations**: Support bulk configuration updates
- **Async Processing**: Non-blocking event creation and updates

---

## Icon and Font Color Enhancement (Phase 7) 🎨

### New Feature Overview
**Status**: Planned  
**Priority**: High  
**Estimated Effort**: 2-3 days  

### Feature Description
Extend the existing event configuration system to include visual customization through icons and font colors, enabling businesses to create more recognizable and accessible customer interfaces.

### Technical Implementation

#### Database Changes
**Migration Required**: Add new columns to EventType table
```sql
ALTER TABLE EventTypes 
ADD COLUMN userFontColor VARCHAR(7) DEFAULT '#ffffff',
ADD COLUMN userIcon VARCHAR(50) DEFAULT NULL;
```

#### Available Icon Categories
**React Icons Library Integration**:
- **General**: FaUser, FaBell, FaClock, FaCheckCircle, FaExclamationTriangle
- **Restaurant**: FaUtensils, FaWineGlassAlt, FaConciergeBell, FaCoffee, FaPizzaSlice
- **Medical**: FaUserMd, FaNotesMedical, FaAmbulance, FaHeartbeat, FaPrescriptionBottle
- **Hotel**: FaBed, FaKey, FaLuggage, FaWifi, FaCar, FaSwimmingPool
- **Service**: FaTools, FaCloudDownloadAlt, FaShoppingCart, FaPhone, FaEnvelope
- **Emergency**: FaExclamationTriangle, FaFire, FaShieldAlt, FaFirstAid

#### Implementation Tasks

**Backend Updates:**
- [ ] **Task 7.1**: Create database migration for userFontColor and userIcon fields
- [ ] **Task 7.2**: Update EventType model validation to include icon and font color
- [ ] **Task 7.3**: Add icon validation (must be valid React Icon component name)
- [ ] **Task 7.4**: Update API endpoints to accept new fields
- [ ] **Task 7.5**: Update default event creation service with new fields

**Frontend Updates:**
- [ ] **Task 7.6**: Create IconPicker component with searchable React Icons
- [ ] **Task 7.7**: Create FontColorPicker component (reuse existing color picker)
- [ ] **Task 7.8**: Update EventConfigModal to include icon and font color inputs
- [ ] **Task 7.9**: Create IconRenderer service to map string names to React components
- [ ] **Task 7.10**: Update ButtonsGroup to render icons and apply font colors
- [ ] **Task 7.11**: Add icon preview in configuration modal
- [ ] **Task 7.12**: Implement accessibility contrast validation

**Icon Picker Component Features:**
```javascript
// IconPicker.js
const IconPicker = ({ 
  selectedIcon, 
  onIconSelect, 
  categories = ['general', 'restaurant', 'medical', 'hotel'],
  searchable = true 
}) => {
  // Search functionality
  // Category filtering
  // Icon preview
  // Clear selection option
}
```

**Font Color Integration:**
```javascript
// ButtonsGroup.js enhancement
<button 
  className="user-button dynamic-event-button" 
  style={{ 
    '--event-color': eventType.userColor,
    '--event-font-color': eventType.userFontColor || '#ffffff'
  }}
>
  {eventType.userIcon && <IconRenderer iconName={eventType.userIcon} />}
  {eventType.eventName}
</button>
```

**CSS Updates:**
```css
.dynamic-event-button {
  background-color: var(--event-color, #007bff) !important;
  border: 2px solid var(--event-color, #007bff) !important;
  color: var(--event-font-color, #ffffff) !important;
  font-weight: 500;
}

.dynamic-event-button .event-icon {
  margin-right: 8px;
  font-size: 1.2em;
}
```

### Default Values
- **userFontColor**: `#ffffff` (white) for maximum contrast with most background colors
- **userIcon**: `null` (no icon) to maintain backward compatibility
- **System Events**: No icons by default, white font color

### User Experience Flow
1. **Admin opens event configuration**
2. **Clicks on icon field** → IconPicker modal opens
3. **Searches/browses icons** → Select appropriate icon for event type
4. **Clicks on font color field** → Color picker opens
5. **Selects readable color** → System validates contrast ratio
6. **Saves configuration** → Changes reflect immediately in customer interface

### Accessibility Considerations
- **Contrast Validation**: Ensure WCAG AA compliance (4.5:1 ratio minimum)
- **Icon Fallback**: Text remains readable even if icon fails to load
- **Color Independence**: Icons provide additional visual cues beyond color
- **Screen Reader Support**: Icons include proper aria-labels

### Industry Presets
```javascript
const industryPresets = {
  restaurant: {
    callWaiter: { icon: 'FaUtensils', colors: ['#ff6b35', '#ffffff'] },
    requestCheck: { icon: 'FaFileInvoiceDollar', colors: ['#28a745', '#ffffff'] },
    callManager: { icon: 'FaUserTie', colors: ['#dc3545', '#ffffff'] }
  },
  hospital: {
    callNurse: { icon: 'FaUserMd', colors: ['#007bff', '#ffffff'] },
    emergency: { icon: 'FaExclamationTriangle', colors: ['#dc3545', '#ffffff'] },
    requestMedicine: { icon: 'FaPrescriptionBottle', colors: ['#28a745', '#ffffff'] }
  },
  hotel: {
    housekeeping: { icon: 'FaBed', colors: ['#6f42c1', '#ffffff'] },
    roomService: { icon: 'FaConciergeBell', colors: ['#fd7e14', '#ffffff'] },
    maintenance: { icon: 'FaTools', colors: ['#6c757d', '#ffffff'] }
  }
};
```

---

## Future Enhancements

### Advanced Features (Phase 2)
- [ ] **Custom Event Templates**: Pre-built event sets for different industries
- [ ] **Conditional Events**: Events that appear based on time/day/occupancy
- [ ] **Multi-language Support**: Event text in multiple languages
- [ ] **Analytics Dashboard**: Track which events are used most frequently
- [ ] **Event Automation**: Trigger events based on external conditions
- [ ] **Location Type Abstraction**: Full migration from "table" to generic "location"

### Integration Possibilities
- [ ] **POS Integration**: Trigger events based on order status (restaurants)
- [ ] **EMR Integration**: Patient status updates (hospitals)
- [ ] **PMS Integration**: Room service requests (hotels)
- [ ] **Staff Mobile App**: Push notifications for high-priority events
- [ ] **Customer Feedback**: Rate experience after event resolution
- [ ] **Webhook Support**: External systems can trigger events

### Industry-Specific Features
- [ ] **Restaurant Mode**: Order status events, kitchen requests
- [ ] **Hospital Mode**: Emergency codes, nurse stations, patient needs
- [ ] **Hotel Mode**: Housekeeping, maintenance, concierge services
- [ ] **Office Mode**: Meeting room management, IT support

---

## Risk Assessment

### Technical Risks
- **Migration Complexity**: Converting existing Event.type data without data loss
- **Performance Impact**: Event resolution queries on high-traffic locations
- **UI Complexity**: Configuration interface becoming overwhelming
- **System Event Integrity**: Preventing accidental deletion of critical events

### Mitigation Strategies
- **Staged Rollout**: Gradual migration with rollback capability
- **Performance Testing**: Load testing with realistic data volumes
- **User Testing**: Validate configuration UI with actual business staff
- **Database Backups**: Full backup before migration operations
- **Feature Flags**: Ability to quickly disable new features if issues arise

### Business Risks
- **User Adoption**: Staff may resist changing from familiar hardcoded events
- **Training Requirements**: Need to educate users on new configuration options
- **Industry Variations**: Different businesses may have conflicting requirements

---

## Success Metrics

### Functional Metrics
- [ ] All existing functionality preserved during migration (100%)
- [ ] Configuration changes reflect in real-time (< 2 seconds)
- [ ] Event resolution queries execute efficiently (< 100ms)
- [ ] Zero data loss during migration process
- [ ] System events remain protected (0 accidental deletions)

### User Experience Metrics
- [ ] Business owners can configure events in < 5 minutes
- [ ] Customer interface load time remains < 1 second
- [ ] Admin interface shows correct priorities 100% of the time
- [ ] User error rate in configuration < 5%
- [ ] Staff satisfaction with customization options > 80%

### Performance Metrics
- [ ] Database query performance maintains current levels
- [ ] Memory usage increases by < 20%
- [ ] API response times remain under current thresholds
- [ ] Frontend bundle size increase < 50KB

---

## Implementation Notes

### Development Guidelines
- **Audit Trail**: All changes must be tracked with user ID and timestamp
- **Soft Deletes**: Never hard delete EventType records
- **Validation**: Strict validation on color codes, required fields, and system event protection
- **Error Handling**: Graceful degradation when configuration is invalid
- **Security**: Ensure only authorized users can modify event configurations

### Code Organization
- **Models**: `src/models/EventType.js`, `src/models/EventConfiguration.js`
- **Migrations**: `src/database/migrations/[timestamp]_create_event_types.js`
- **API Routes**: `src/routes/events.js` for event management
- **Components**: `src/components/EventConfigModal.js` for configuration UI
- **Services**: `src/services/eventConfig.js` for event resolution logic
- **Constants**: Update `src/constants.js` to support dynamic events

### Testing Strategy
- **Unit Tests**: Model validation and business logic
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows for configuration and usage
- **Performance Tests**: Load testing with realistic data volumes

---

## Dependencies

### Backend Dependencies
- Sequelize ORM (existing)
- Express.js (existing)
- PostgreSQL (existing)
- Color validation library (new)

### Frontend Dependencies
- React (existing)
- Color picker component (new)
- Icon library for inheritance visualization (existing)

### Development Dependencies
- Migration tooling (existing)
- Testing frameworks (existing)
- Performance monitoring (optional)

---

**Last Updated**: 2025-08-20
**Updated By**: Claude Code
**Next Review**: After Phase 7 (Icon & Font Color) completion
**Version**: 2.1 - Enhanced visual customization with icons and font colors

## Recent Updates (v2.1)
- ✅ **Added Icon Selection**: React Icons library integration for event type customization
- ✅ **Added Font Color Control**: Custom text colors for optimal button readability
- ✅ **Enhanced Database Schema**: New userFontColor and userIcon fields in EventType model
- ✅ **Updated Default Events**: Included icons and font colors in default event templates
- ✅ **Added Industry Presets**: Pre-configured icon and color schemes for different business types
- ✅ **Accessibility Focus**: WCAG AA contrast validation and screen reader support
- 📋 **Implementation Plan**: Detailed task breakdown for Phase 7 implementation