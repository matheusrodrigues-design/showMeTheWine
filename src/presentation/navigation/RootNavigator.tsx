import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/presentation/providers/AuthProvider';
import { AuthScreen } from '@/presentation/screens/AuthScreen';
import { CellarsScreen } from '@/presentation/screens/CellarsScreen';
import { DailyTipScreen } from '@/presentation/screens/DailyTipScreen';
import { SommelierScreen } from '@/presentation/screens/SommelierScreen';
import { colors } from '@/core/theme/colors';

export type RootTabParamList = {
  Adegas: undefined;
  Dica: undefined;
  Sommelier: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.amolde,
    card: colors.amolde,
    text: colors.cream,
    border: '#2A2A2A',
    primary: colors.gold,
  },
};

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: focused ? colors.gold : colors.muted,
        marginTop: 2,
      }}
    >
      {label}
    </Text>
  );
}

export function RootNavigator() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabBarHeight = 52 + bottomPad;

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: '#0E0E0E',
            borderTopColor: '#2A2A2A',
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabBarHeight,
            paddingTop: 10,
            paddingBottom: bottomPad,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
          },
        }}
      >
        <Tab.Screen
          name="Adegas"
          component={CellarsScreen}
          options={{
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Adegas" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Dica"
          component={DailyTipScreen}
          options={{
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Dica" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Sommelier"
          component={SommelierScreen}
          options={{
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => (
              <TabLabel label="Busca" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.amolde,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
