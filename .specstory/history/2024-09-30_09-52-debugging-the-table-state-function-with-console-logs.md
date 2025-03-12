## SpecStory

## Debugging the Table State Function with Console Logs (9/30/2024, 9:52:21 AM)

_**User**_

esta funcion  no esta funcionando correctamente, agregame console logs para ver donde esta fallando

---

_**Assistant**_

Certainly! I'll add console logs to the `getTableState` function to help identify where it might be failing. Here's the updated function with console logs:

```javascript:src/components/AdminScreen.js
const getTableState = (events) => {
  console.log('Starting getTableState with events:', events);

  if (events.length === 0) {
    console.log('No events, returning AVAILABLE');
    return TableStates.AVAILABLE;
  }
  
  const lastEvent = events[events.length - 1];
  console.log('Last event:', lastEvent);

  if ([EventTypes.SCAN, EventTypes.MARK_OCCUPIED, EventTypes.MARK_SEEN].includes(lastEvent.type)) {
    console.log('Last event is SCAN, MARK_OCCUPIED, or MARK_SEEN, returning OCCUPIED');
    return TableStates.OCCUPIED;
  }
  if (lastEvent.type === EventTypes.MARK_AVAILABLE) {
    console.log('Last event is MARK_AVAILABLE, returning AVAILABLE');
    return TableStates.AVAILABLE;
  }

  let hasWaiter = false;
  let hasCheck = false;
  console.log('Checking for WAITER and CHECK events');
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    console.log(`Checking event at index ${i}:`, event);
    if (event.type === EventTypes.MARK_SEEN) {
      console.log('Found MARK_SEEN event, stopping search');
      break;
    }
    if (event.type === EventTypes.CALL_WAITER) {
      console.log('Found CALL_WAITER event');
      hasWaiter = true;
    }
    if (event.type === EventTypes.REQUEST_CHECK) {
      console.log('Found REQUEST_CHECK event');
      hasCheck = true;
    }
    if (hasWaiter && hasCheck) {
      console.log('Both WAITER and CHECK found, returning WAITER_AND_CHECK');
      return TableStates.WAITER_AND_CHECK;
    }
  }

  if (hasWaiter) {
    console.log('Only WAITER found, returning WAITER');
    return TableStates.WAITER;
  }
  if (hasCheck) {
    console.log('Only CHECK found, returning CHECK');
    return TableStates.CHECK;
  }

  console.log('No special conditions met, returning OCCUPIED');
  return TableStates.OCCUPIED;
};
```

These console logs will help you trace the function's execution path and see the state of events at each step. You can check the browser's console to see these logs when the function is called.

To use this updated function:

1. Replace the existing `getTableState` function in your `AdminScreen.js` file with this new version.
2. Open your browser's developer tools (usually F12 or right-click and select "Inspect").
3. Go to the Console tab in the developer tools.
4. Interact with your application to trigger the `getTableState` function.
5. Look at the console logs to see how the function is processing the events and determining the table state.

This should help you identify where the function might be failing or producing unexpected results. If you're still having issues after reviewing the logs, please share the console output, and I'll be happy to help you further diagnose the problem.

---



---

