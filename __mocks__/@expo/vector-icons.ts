/**
 * Manual mock for @expo/vector-icons.
 *
 * @expo/vector-icons depends on native font assets and expo-modules-core
 * which are unavailable in the Node/vitest test environment.
 * This mock stubs every icon family with a minimal React component.
 *
 * Vitest picks this up automatically via vi.mock('@expo/vector-icons') in test-setup.ts.
 */

import React from 'react';
import { Text } from 'react-native';

type IconProps = {
  name?: string;
  size?: number;
  color?: string;
  style?: object;
  testID?: string;
  accessibilityLabel?: string;
};

function createIconComponent(family: string) {
  return function MockIcon({ name, size, color }: IconProps) {
    return React.createElement(
      Text,
      {
        testID: `icon-${family}-${name ?? 'unknown'}`,
        accessibilityLabel: name,
        style: { fontSize: size, color },
      },
      name ?? null,
    );
  };
}

export const Ionicons = createIconComponent('ionicons');
export const MaterialIcons = createIconComponent('material');
export const MaterialCommunityIcons = createIconComponent('material-community');
export const FontAwesome = createIconComponent('fontawesome');
export const FontAwesome5 = createIconComponent('fontawesome5');
export const AntDesign = createIconComponent('antdesign');
export const Entypo = createIconComponent('entypo');
export const EvilIcons = createIconComponent('evilicons');
export const Feather = createIconComponent('feather');
export const Foundation = createIconComponent('foundation');
export const Octicons = createIconComponent('octicons');
export const SimpleLineIcons = createIconComponent('simplelineicons');
export const Zocial = createIconComponent('zocial');
