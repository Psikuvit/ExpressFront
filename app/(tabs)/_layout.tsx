import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { user, isDeliveryMode } = useAuth();
  const hasDeliveryRole = user?.roles?.includes('ROLE_DELIVERY') ?? false;
  const showDeliveryTab = hasDeliveryRole && isDeliveryMode;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#53b175',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }) => <TabIcon emoji="🍽️" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Drivers',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏍️" />,
        }}
      />
      {showDeliveryTab && (
        <Tabs.Screen
          name="delivery"
          options={{
            title: 'Delivery',
            tabBarIcon: ({ color }) => <TabIcon emoji="📦" />,
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" />,
        }}
      />
    </Tabs>
  );
}
