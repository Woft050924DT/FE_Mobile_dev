import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../../constants/Colors';
import { Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { isDoctor } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: MedicalColors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
        },
        headerTitleStyle: {
          fontWeight: '800',
          color: MedicalColors.textPrimary,
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="body-map"
        options={{
          title: 'Body Map',
          href: isDoctor ? null : '/body-map',
          tabBarItemStyle: isDoctor ? { display: 'none' } : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'body' : 'body-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: 'Khai báo triệu chứng',
        }}
      />

      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch khám',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: 'Lịch hẹn & Bệnh án EMR',
        }}
      />

      <Tabs.Screen
        name="care"
        options={{
          title: 'CSKH & Nhắc nhở',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: 'Chăm sóc khách hàng (CRM)',
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: 'Thông tin cá nhân & Hồ sơ',
        }}
      />

      {/* Ẩn tab 'two' mặc định nếu có */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
