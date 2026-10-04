import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#0284C7',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            title: 'Đăng nhập',
            headerShown: true,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="book-appointment"
          options={{
            title: 'Đặt lịch khám tại nhà',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="appointment-detail"
          options={{
            title: 'Hồ sơ bệnh án điện tử',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="doctor-examination"
          options={{
            title: 'Khám bệnh & Kê đơn tại nhà',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="cskh-appointments"
          options={{
            title: 'Bàn điều phối lịch khám',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="cskh-followups"
          options={{
            title: 'Quản lý tái khám (CRM)',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="doctor-workspace"
          options={{
            title: 'Ca trực Bác sĩ tại nhà',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="doctor-dashboard"
          options={{
            title: 'Dashboard Bác sĩ',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="patient-emr-history"
          options={{
            title: 'Hồ sơ bệnh án EMR tổng hợp',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Thông tin hệ thống',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
