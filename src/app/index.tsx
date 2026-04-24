/**
 * Root index — redirects to /food.
 *
 * Food Pod is the sole feature of this app.
 * The NativeTabs root triggers navigation; this redirect
 * ensures any direct visit to '/' lands on the Food Pod screen.
 */

import { Redirect } from 'expo-router';

export default function IndexRedirect() {
  return <Redirect href="/food" />;
}
