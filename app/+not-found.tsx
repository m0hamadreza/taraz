import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'صفحه پیدا نشد' }} />
      <View className="bg-background flex-1 items-center justify-center gap-3 p-5">
        <Text className="text-lg font-semibold">این صفحه وجود ندارد.</Text>
        <Link href="/">
          <Text className="text-primary text-sm">بازگشت به پرتفوی</Text>
        </Link>
      </View>
    </>
  );
}
