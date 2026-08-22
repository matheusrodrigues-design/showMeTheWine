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
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: '#D9CBC2',
    primary: colors.bordoux,
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
        color: focused ? colors.bordoux : colors.muted,
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
        <ActivityIndicator color={colors.bordoux} />
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
          tabBarActiveTintColor: colors.bordoux,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.paperWarm,
            borderTopColor: '#D9CBC2',
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
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
