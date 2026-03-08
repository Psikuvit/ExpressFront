# Express App (Expo / React Native)

Mobile frontend for the Express ordering and delivery platform.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:

   ```env
   EXPO_PUBLIC_API_URL=http://<your-backend-host>:8080
   EXPO_PUBLIC_APP_TOKEN=<optional-app-token>
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<optional-for-native-map-provider-config>
   ```

3. Start the app:

   ```bash
   npx expo start
   ```

## Scripts

- `npm run lint` — Run Expo/TypeScript lint checks.
- `npm run reset-project` — Reset starter scaffold.

## App Structure

- `app/(auth)` — Login and registration flow.
- `app/(tabs)` — Main app tabs (Menu, Drivers, Profile, Delivery*).
- `app/checkout.tsx` — Checkout flow.
- `app/order-confirm.tsx` — Order confirmation screen.
- `app/delivery-auth.tsx` — Delivery partner registration form.
- `context/AuthContext.tsx` — Auth state and role-aware user updates.
- `api/client.ts` — API clients (auth, checkout, delivery, location).

`*` Delivery tab is only visible for users with `ROLE_DELIVERY`.

## Delivery Mode Flow

### Registration

- From Profile, tap **Switch to Delivery Mode**.
- If user does not have `ROLE_DELIVERY`, app navigates to `delivery-auth`.
- User submits `age`, `car`, and `whatsappNumber`.
- Frontend calls `deliveryAuthAPI.register()`.
- On success, user roles are refreshed in `AuthContext` so UI updates immediately.

### Delivery Orders Tab

- Route: `app/(tabs)/delivery.tsx`.
- Loads orders via `deliveryAuthAPI.getOrders()`.
- Shows only `PENDING` orders.
- Polls every 5 seconds for real-time updates.
- Each order card displays:
  - Items
  - Total price
  - Distance
  - Delivery address
  - **Accept** button
- Accept uses `deliveryAuthAPI.acceptOrder(orderId)` and removes accepted item from the pending list.

## Delivery Reliability and UX

### 1. Optimistic Accept Order

- Delivery orders now use TanStack Query (`@tanstack/react-query`).
- Tapping **Accept** updates the UI immediately (optimistic mutation).
- On backend validation failure, the list rolls back and shows an error alert.
- On network failure, intent is queued offline and retried automatically.

### 2. Background Location Tracking

- Uses `expo-location` + `expo-task-manager` background task.
- When a delivery partner is in **Delivery Mode**, background location updates start automatically.
- Updates continue while the app is minimized (subject to OS permission/battery constraints).

### 3. Offline Queue and Auto Retry

- Uses AsyncStorage-backed queue in `utils/offline-queue.ts`.
- Queued actions:
   - Accept order intent
   - Driver location update
- Queue is flushed automatically when connectivity is restored (`expo-network` listener).

### 4. Distance and ETA Visual Feedback

- Delivery order cards now show:
   - Estimated ETA (simple speed-based estimate)
   - Route preview map with driver marker, destination marker, and a polyline
- Implemented with `react-native-maps`.
- Current implementation draws a direct polyline between points; road-snapped routing can be added later via Google Directions/Mapbox Directions API.

## Role-Based Navigation Rules

- Root stack registers `delivery-auth` screen.
- Tabs layout conditionally renders **Delivery** tab only when `ROLE_DELIVERY` exists.
- Profile mode toggle:
  - `Switch to Delivery Mode` (or opens registration for non-delivery users)
  - `Switch to Client Mode`

## API Methods Used (Delivery)

- `deliveryAuthAPI.register(data)`
- `deliveryAuthAPI.getMe()`
- `deliveryAuthAPI.getOrders()`
- `deliveryAuthAPI.acceptOrder(orderId)`

## New Infrastructure Files

- `lib/query-client.ts` — shared QueryClient setup.
- `hooks/use-offline-queue-processor.ts` — connectivity-triggered queue flush.
- `utils/offline-queue.ts` — AsyncStorage queue for offline delivery intents.
- `services/background-location.ts` — background location task registration/start/stop.
