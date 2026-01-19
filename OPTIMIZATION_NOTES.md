# Keymaster Integration Optimization Notes

## Overview
This document describes the optimization changes made to the keymaster integration's automation generation to improve performance and maintainability.

## Problem Statement
The original keymaster integration generated a large number of automations and scripts for managing Z-Wave lock codes. For a typical setup with 10 code slots and 2 child locks, this resulted in:
- **800+ automations** being created
- Slow Home Assistant startup and reload times
- Difficult troubleshooting due to scattered logic
- High memory footprint

## Optimization Changes

### 1. Child Lock Synchronization (keymaster_child.yaml)

#### Before
- **38 individual automations per code slot** to copy settings from parent to child lock
- Each automation watched a single parent entity and copied to corresponding child entity
- Separate automations for: name, PIN, enabled, notify, reset, access limit, access count, date range, start/end dates, and 7 days × 4 entities (enabled, include/exclude, start time, end time)
- A script that triggered all 38 automations when override was turned off
- **Total: 380 automations for 10 slots**

#### After
- **1 consolidated automation per code slot** with 38 triggers
- Uses trigger IDs to identify which entity changed
- Dynamic routing via `choose` conditions based on entity type:
  - Text inputs → `input_text.set_value`
  - Number inputs → `input_number.set_value`
  - Boolean inputs → `input_boolean.turn_on/off`
  - DateTime inputs → `input_datetime.set_datetime`
- Script simplified with `repeat` loops for day-of-week operations
- **Total: 10 automations for 10 slots (97.4% reduction)**

#### Key Technical Features
```yaml
- mode: queued  # Prevents race conditions during bulk updates
- trigger IDs for entity identification
- choose actions with template conditions
- repeat loops for repetitive patterns
```

### 2. Autolock Management (keymaster_common.yaml & keymaster_common_child.yaml)

#### Before
**8 separate automations per lock:**
1. `keymaster_LOCKNAME_locked` - Cancel timer when lock state changes to locked
2. `keymaster_turn_off_retry_LOCKNAME` - Turn off retry flag on lock
3. `keymaster_retry_bolt_closed_LOCKNAME` - Retry lock operation when door sensor shows closed
4. `keymaster_LOCKNAME_opened` - Start autolock timer when door opens
5. `keymaster_LOCKNAME_unlocked_start_autolock` - Start timer when lock is unlocked
6. `keymaster_LOCKNAME_timer_finished` - Execute lock when timer expires
7. `keymaster_LOCKNAME_timer_canceled` - Cleanup when timer is canceled
8. `keymaster_LOCKNAME_disable_auto_lock` - Cancel timer when autolock is disabled
9. `keymaster_LOCKNAME_enable_auto_lock` - Setup timer when autolock is enabled

**Total: 24 automations for 3 locks (1 primary + 2 children)**

#### After
- **1 consolidated automation** `keymaster_LOCKNAME_autolock_manager` per lock
- **8 triggers with unique IDs:**
  - Lock state changes (locked, unlocked)
  - Door sensor changes (opened, closed)
  - Autolock toggle changes (enabled, disabled)
  - Timer events (finished, cancelled)
- **8 choose conditions** mapping triggers to appropriate actions
- **Total: 3 automations for 3 locks (87.5% reduction)**

#### Key Technical Features
```yaml
- mode: queued  # Ensures events are processed in order
- Trigger IDs for event identification
- Choose actions for conditional logic
- Inline comments for maintainability
```

## Performance Impact

### For Typical Setup (1 Primary + 2 Child Locks, 10 Code Slots)

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Child Sync Automations** | 760 | 20 | 97.4% |
| **Autolock Automations** | 24 | 3 | 87.5% |
| **Total Automations** | ~800 | ~60 | 92.5% |
| **File Size (child)** | 1,023 lines | 628 lines | 38.6% |

### Benefits
1. **Faster Home Assistant Startup** - Fewer automations to parse and initialize
2. **Reduced Memory Usage** - Single automation instance vs. dozens
3. **Easier Troubleshooting** - Logic centralized in one place per feature
4. **Better Maintainability** - Changes apply to all triggers/conditions
5. **Clearer Intent** - Documented behavior with inline comments

## Migration Notes

### Backward Compatibility
- Generated YAML files maintain the same entity IDs
- Existing user configurations remain unchanged
- Only the number of automations changes

### Regeneration Required
Users must regenerate their package files to benefit from these optimizations:
1. Open the Keymaster integration configuration
2. Re-save the configuration (triggers package regeneration)
3. Restart Home Assistant

### Testing Recommendations
After regenerating packages:
1. Verify autolock functionality (lock/unlock, timer behavior)
2. For child locks: test parent-child synchronization
3. Check automation logs for any errors

## Technical Details

### Why These Patterns Work Better

#### Consolidated Automations with Trigger IDs
```yaml
trigger:
  - platform: state
    entity_id: input_text.parent_name_1
    id: name
  - platform: state
    entity_id: input_boolean.parent_enabled_1
    id: enabled
    
action:
  - choose:
      - conditions:
          - condition: template
            value_template: "{{ trigger.id == 'name' }}"
        sequence:
          - service: input_text.set_value
            # ... 
```

**Advantages:**
- Single automation instance in memory
- Shared configuration parsing
- Unified execution context
- Easier to add new triggers

#### Repeat Loops vs. Hardcoded Entities
```yaml
- repeat:
    for_each: [sun, mon, tue, wed, thu, fri, sat]
    sequence:
      - service: >
          {% if is_state('input_boolean.' + repeat.item + '_PARENT_1', 'on') %}
            input_boolean.turn_on
          {% else %}
            input_boolean.turn_off
          {% endif %}
        target:
          entity_id: "input_boolean.{{ repeat.item }}_CHILD_1"
```

**Advantages:**
- DRY (Don't Repeat Yourself) principle
- Easy to modify all days at once
- Reduced template file size
- Self-documenting intent

## Future Optimization Opportunities

### 1. Entity Consolidation
- Consider using `input_select` for day-of-week instead of 7 booleans
- Use multi-valued fields where appropriate

### 2. Template Sensors
- Extract binary sensor templates into shared macros
- Reduce per-slot duplication

### 3. Event-Driven Architecture
- Fire custom events instead of state watching where appropriate
- Further reduce automation overhead

## Conclusion

These optimizations maintain full backward compatibility while dramatically reducing the automation overhead of the keymaster integration. Users benefit from faster Home Assistant performance, easier troubleshooting, and a more maintainable codebase.

The consolidation patterns used here (trigger IDs, choose conditions, repeat loops) can serve as examples for other Home Assistant integrations with similar scaling challenges.
