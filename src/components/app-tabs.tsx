/**
 * App tab bar — Food Pod only.
 *
 * Single 'Food Pod' tab; no Home, no Explore.
 * This is a standalone food-pod app — one feature, one tab.
 */
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="food">
        <Label>Food Pod</Label>
        <Icon src={require('@/assets/images/tabIcons/food.png')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
