import { MouseSensor, type MouseSensorOptions, type TouchSensorOptions } from '@dnd-kit/core';

export const MOUSE_SENSOR_OPTIONS: MouseSensorOptions = {
  activationConstraint: { distance: 5 },
};

export const HANDLE_TOUCH_SENSOR_OPTIONS: TouchSensorOptions = {
  activationConstraint: { distance: 5 },
};

/** A whole row as the drag target needs a hold, or every scroll would be a drag. */
export const FULL_ROW_TOUCH_SENSOR_OPTIONS: TouchSensorOptions = {
  activationConstraint: { delay: 200, tolerance: 5 },
};

/** Drags on the primary button only, so a right click opens a menu instead of lifting the row. */
export class PrimaryButtonMouseSensor extends MouseSensor {
  static override activators: typeof MouseSensor.activators = [
    {
      eventName: 'onMouseDown',
      handler: ({ nativeEvent: event }: { nativeEvent: MouseEvent }, options): boolean => {
        if (event.button !== 0) return false;
        options.onActivation?.({ event });
        return true;
      },
    },
  ];
}
