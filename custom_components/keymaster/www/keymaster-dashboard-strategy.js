/**
 * Keymaster Dashboard Strategy
 * 
 * This strategy automatically generates a dashboard view for keymaster locks.
 */

class KeymasterDashboardStrategy extends HTMLElement {
  static async generate(config, hass) {
    // Get all keymaster entities
    const entities = Object.keys(hass.states).filter(
      (entityId) => entityId.startsWith('input_text.') && entityId.includes('_name_')
    );

    // Group entities by lock name
    const lockGroups = {};
    
    entities.forEach((entityId) => {
      const parts = entityId.split('_');
      // Extract lock name from entity ID (format: input_text.{lockname}_name_{slot})
      // Find the index of 'name' and extract everything before it as the lock name
      const nameIndex = parts.indexOf('name');
      if (nameIndex > 1) {
        const lockName = parts.slice(1, nameIndex).join('_');
        if (!lockGroups[lockName]) {
          lockGroups[lockName] = [];
        }
        const slot = parts[nameIndex + 1];
        if (slot && !isNaN(slot)) {
          lockGroups[lockName].push(parseInt(slot));
        }
      }
    });

    // Generate views for each lock
    const views = [];
    
    for (const [lockName, slots] of Object.entries(lockGroups)) {
      const lockEntity = `lock.${lockName}`;
      const doorSensor = `binary_sensor.${lockName}_door`;
      const lockNameInput = `input_text.${lockName}_lockname`;
      
      // Sort slots numerically
      slots.sort((a, b) => a - b);

      // Create cards for each code slot
      const cards = slots.map(slotNum => ({
        type: 'vertical-stack',
        cards: [
          {
            type: 'markdown',
            content: `## Code ${slotNum}`
          },
          {
            type: 'entities',
            show_header_toggle: false,
            entities: [
              `input_text.${lockName}_name_${slotNum}`,
              `input_text.${lockName}_pin_${slotNum}`,
              `input_boolean.enabled_${lockName}_${slotNum}`,
              `input_boolean.notify_${lockName}_${slotNum}`,
              { type: 'divider' },
              {
                entity: `sensor.connected_${lockName}_${slotNum}`,
                state_color: true
              },
              {
                entity: `binary_sensor.active_${lockName}_${slotNum}`,
                state_color: true
              },
              {
                type: 'custom:fold-entity-row',
                head: {
                  type: 'section',
                  label: 'Advanced Options'
                },
                entities: [
                  `input_boolean.reset_codeslot_${lockName}_${slotNum}`,
                  { type: 'divider' },
                  `input_boolean.accesslimit_${lockName}_${slotNum}`,
                  {
                    entity: `input_number.accesscount_${lockName}_${slotNum}`,
                    type: 'custom:numberbox-card',
                    icon: 'mdi:key-variant',
                    speed: 250
                  },
                  { type: 'divider' },
                  `input_boolean.daterange_${lockName}_${slotNum}`,
                  `input_datetime.start_date_${lockName}_${slotNum}`,
                  `input_datetime.end_date_${lockName}_${slotNum}`,
                  {
                    type: 'custom:fold-entity-row',
                    head: {
                      type: 'section',
                      label: 'Custom Weekdays'
                    },
                    entities: [
                      `input_boolean.sun_${lockName}_${slotNum}`,
                      `input_boolean.sun_inc_${lockName}_${slotNum}`,
                      `input_datetime.sun_start_date_${lockName}_${slotNum}`,
                      `input_datetime.sun_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.mon_${lockName}_${slotNum}`,
                      `input_boolean.mon_inc_${lockName}_${slotNum}`,
                      `input_datetime.mon_start_date_${lockName}_${slotNum}`,
                      `input_datetime.mon_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.tue_${lockName}_${slotNum}`,
                      `input_boolean.tue_inc_${lockName}_${slotNum}`,
                      `input_datetime.tue_start_date_${lockName}_${slotNum}`,
                      `input_datetime.tue_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.wed_${lockName}_${slotNum}`,
                      `input_boolean.wed_inc_${lockName}_${slotNum}`,
                      `input_datetime.wed_start_date_${lockName}_${slotNum}`,
                      `input_datetime.wed_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.thu_${lockName}_${slotNum}`,
                      `input_boolean.thu_inc_${lockName}_${slotNum}`,
                      `input_datetime.thu_start_date_${lockName}_${slotNum}`,
                      `input_datetime.thu_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.fri_${lockName}_${slotNum}`,
                      `input_boolean.fri_inc_${lockName}_${slotNum}`,
                      `input_datetime.fri_start_date_${lockName}_${slotNum}`,
                      `input_datetime.fri_end_date_${lockName}_${slotNum}`,
                      { type: 'divider' },
                      `input_boolean.sat_${lockName}_${slotNum}`,
                      `input_boolean.sat_inc_${lockName}_${slotNum}`,
                      `input_datetime.sat_start_date_${lockName}_${slotNum}`,
                      `input_datetime.sat_end_date_${lockName}_${slotNum}`
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }));

      // Create the view for this lock
      const lockNameFormatted = lockName.charAt(0).toUpperCase() + lockName.slice(1).replace(/_/g, ' ');
      
      views.push({
        title: `${lockNameFormatted} Codes and Configuration`,
        path: `keypad-${lockName}`,
        icon: 'mdi:lock-smart',
        badges: [
          lockNameInput,
          `input_boolean.${lockName}_lock_notifications`,
          `input_boolean.${lockName}_dooraccess_notifications`,
          `input_boolean.${lockName}_garageacess_notifications`,
          lockEntity,
          doorSensor,
          `input_text.keymaster_${lockName}_autolock_door_time_day`,
          `input_text.keymaster_${lockName}_autolock_door_time_night`,
          `input_boolean.keymaster_${lockName}_autolock`,
          `timer.keymaster_${lockName}_autolock`
        ].filter(entity => hass.states[entity]), // Only include entities that exist
        cards: cards
      });
    }

    return {
      views: views.length > 0 ? views : [
        {
          title: 'No Locks Found',
          path: 'no-locks',
          cards: [
            {
              type: 'markdown',
              content: '## No Keymaster Locks Configured\n\nPlease configure your keymaster locks through the integration settings first.'
            }
          ]
        }
      ]
    };
  }
}

customElements.define('ll-strategy-dashboard-keymaster', KeymasterDashboardStrategy);

window.customStrategies = window.customStrategies || {};
window.customStrategies['keymaster'] = KeymasterDashboardStrategy;

console.info(
  '%c KEYMASTER-DASHBOARD-STRATEGY %c Loaded ',
  'color: white; background: #0277bd; font-weight: bold;',
  'color: #0277bd; background: white; font-weight: bold;'
);
