import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  minDate?: Date; // Mặc định là hôm nay, không cho chọn ngày quá khứ
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const DatePickerModal: React.FC<Props> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  minDate = new Date(),
}) => {
  // Chuẩn hóa minDate về đầu ngày 00:00:00
  const normalizedMin = new Date(minDate);
  normalizedMin.setHours(0, 0, 0, 0);

  // Tháng đang duyệt trên lịch
  const [viewDate, setViewDate] = useState<Date>(new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // Tính số ngày trong tháng hiện tại
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Ngày đầu tháng rơi vào thứ mấy (0 là CN, 1 là T2... chuyển về 0: T2 -> 6: CN)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  // Kiểm tra xem có thể lùi tháng trước được không
  const canGoPrevMonth = () => {
    const prevMonthEnd = new Date(year, month, 0);
    prevMonthEnd.setHours(23, 59, 59, 999);
    return prevMonthEnd.getTime() >= normalizedMin.getTime();
  };

  const handlePrevMonth = () => {
    if (canGoPrevMonth()) {
      setViewDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isPastDay = (d: Date) => {
    const check = new Date(d);
    check.setHours(0, 0, 0, 0);
    return check.getTime() < normalizedMin.getTime();
  };

  // Tạo các ô cho lưới lịch
  const calendarCells = [];
  // Ô trống đầu tháng
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<View key={`empty-${i}`} style={styles.cell} />);
  }
  // Các ngày trong tháng
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const isPast = isPastDay(cellDate);
    const isSelected = isSameDay(cellDate, selectedDate);
    const isToday = isSameDay(cellDate, new Date());

    calendarCells.push(
      <TouchableOpacity
        key={`day-${day}`}
        style={[
          styles.cell,
          isSelected && styles.cellSelected,
          isToday && !isSelected && styles.cellToday,
        ]}
        disabled={isPast}
        onPress={() => {
          onSelectDate(cellDate);
          onClose();
        }}
      >
        <Text
          style={[
            styles.cellText,
            isPast && styles.cellTextPast,
            isSelected && styles.cellTextSelected,
            isToday && !isSelected && styles.cellTextToday,
          ]}
        >
          {day}
        </Text>
        {isToday && !isSelected && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chọn ngày khám</Text>
              <Text style={styles.subTitle}>
                Không thể chọn ngày trong quá khứ
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrevMonth()}
              style={[styles.navBtn, !canGoPrevMonth() && styles.navBtnDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoPrevMonth() ? '#0284C7' : '#CBD5E1'}
              />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              Tháng {month + 1} / {year}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color="#0284C7" />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.weekHeader}>
            {DAYS_OF_WEEK.map((d, index) => (
              <Text
                key={d}
                style={[
                  styles.weekText,
                  (index === 5 || index === 6) && styles.weekendText,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>{calendarCells}</View>

          {/* Legend / Ghi chú */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#0284C7' }]} />
              <Text style={styles.legendText}>Đang chọn</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { borderColor: '#0284C7', borderWidth: 1 }]} />
              <Text style={styles.legendText}>Hôm nay</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#F1F5F9' }]} />
              <Text style={styles.legendText}>Quá khứ (Khóa)</Text>
            </View>
          </View>

          {/* Quick select buttons */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const today = new Date();
                onSelectDate(today);
                onClose();
              }}
            >
              <Text style={styles.quickBtnText}>Hôm nay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onSelectDate(tomorrow);
                onClose();
              }}
            >
              <Text style={styles.quickBtnText}>Ngày mai</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onSelectDate(nextWeek);
                onClose();
              }}
            >
              <Text style={styles.quickBtnText}>Sau 1 tuần</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  navBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
  },
  navBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  weekendText: {
    color: '#EF4444',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  cellSelected: {
    backgroundColor: '#0284C7',
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  cellTextPast: {
    color: '#CBD5E1',
    textDecorationLine: 'line-through',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cellTextToday: {
    color: '#0284C7',
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0284C7',
    position: 'absolute',
    bottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
});
