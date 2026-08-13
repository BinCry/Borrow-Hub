import { Stack } from 'expo-router';

export default function RentalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/payment" />
      <Stack.Screen name="[id]/contract" />
      <Stack.Screen name="[id]/handover" />
      <Stack.Screen name="[id]/qr" />
      <Stack.Screen name="[id]/return" />
    </Stack>
  );
}
