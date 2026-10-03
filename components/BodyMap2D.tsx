import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  G,
  Rect,
} from 'react-native-svg';
import { MedicalColors } from '../constants/Colors';

export interface BodyPartData {
  id: number;
  code: string;
  name: string;
  region: string;
  view_side: 'front' | 'back' | string;
  coord_x: number;
  coord_y: number;
}

export interface SelectedSymptomItem {
  bodyPartId: number;
  bodyPartName: string;
  symptomId?: number;
  symptomName?: string;
  severity: 'mild' | 'moderate' | 'severe';
  note?: string;
}

interface Props {
  bodyParts: BodyPartData[];
  selectedItems: SelectedSymptomItem[];
  activeSide: 'front' | 'back';
  onChangeSide: (side: 'front' | 'back') => void;
  onPressPart: (part: BodyPartData) => void;
}

export const BodyMap2D: React.FC<Props> = ({
  bodyParts,
  selectedItems,
  activeSide,
  onChangeSide,
  onPressPart,
}) => {
  const WIDTH = 300;
  const HEIGHT = 440;

  // Lọc các điểm giải phẫu theo mặt trước / mặt sau
  const currentParts = bodyParts.filter((p) => p.view_side === activeSide);

  const getSelectedItem = (partId: number) => {
    return selectedItems.find((item) => item.bodyPartId === partId);
  };

  const getHotspotColor = (item?: SelectedSymptomItem) => {
    if (!item) return MedicalColors.primary;
    if (item.severity === 'severe') return MedicalColors.danger;
    if (item.severity === 'moderate') return MedicalColors.warning;
    return MedicalColors.success;
  };

  return (
    <View style={styles.card}>
      {/* Tab chuyển đổi Mặt trước / Mặt sau */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeSide === 'front' && styles.toggleBtnActive,
          ]}
          onPress={() => onChangeSide('front')}
        >
          <Text
            style={[
              styles.toggleText,
              activeSide === 'front' && styles.toggleTextActive,
            ]}
          >
            Mặt Trước (Front)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeSide === 'back' && styles.toggleBtnActive,
          ]}
          onPress={() => onChangeSide('back')}
        >
          <Text
            style={[
              styles.toggleText,
              activeSide === 'back' && styles.toggleTextActive,
            ]}
          >
            Mặt Sau (Back)
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        💡 Chạm vào điểm tròn trên cơ thể để chọn vị trí đau & triệu chứng
      </Text>

      {/* SVG Canvas mô hình giải phẫu người */}
      <View style={styles.canvasContainer}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Defs>
            <LinearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E0F2FE" />
              <Stop offset="100%" stopColor="#BAE6FD" />
            </LinearGradient>
            <LinearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E0F2FE" />
              <Stop offset="100%" stopColor="#BAE6FD" />
            </LinearGradient>
            <LinearGradient id="limbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#E0F2FE" />
              <Stop offset="100%" stopColor="#93C5FD" />
            </LinearGradient>
          </Defs>

          {/* Bóng mờ nền thẩm mỹ */}
          <Circle cx="150" cy="220" r="140" fill="#F0F9FF" opacity={0.6} />

          {/* Phác thảo cơ thể người y tế */}
          <G stroke="#0284C7" strokeWidth="2.2" strokeLinejoin="round">
            {/* Đầu (Head) */}
            <Circle cx="150" cy="45" r="28" fill="url(#headGrad)" />

            {/* Cổ (Neck) */}
            <Path d="M 143 72 L 143 85 L 157 85 L 157 72 Z" fill="#BAE6FD" />

            {/* Thân trên & Ngực / Lưng (Torso) */}
            <Path
              d="M 125 85 C 105 87, 95 95, 90 115 L 85 180 C 85 200, 105 210, 120 215 L 180 215 C 195 210, 215 200, 215 180 L 210 115 C 205 95, 195 87, 175 85 Z"
              fill="url(#bodyGrad)"
            />

            {/* Đường ngăn giải phẫu ngực / bụng */}
            {activeSide === 'front' ? (
              <Path
                d="M 110 145 C 130 155, 170 155, 190 145"
                stroke="#0369A1"
                strokeWidth="1.2"
                strokeDasharray="4,4"
                fill="none"
              />
            ) : (
              <Path
                d="M 150 85 L 150 215"
                stroke="#0369A1"
                strokeWidth="1.2"
                strokeDasharray="4,4"
                fill="none"
              />
            )}

            {/* Cánh tay trái */}
            <Path
              d="M 88 105 C 75 125, 65 160, 60 195 C 57 215, 52 240, 50 255 C 48 265, 58 270, 62 260 C 68 245, 75 220, 80 195 L 88 140 Z"
              fill="url(#limbGrad)"
            />

            {/* Cánh tay phải */}
            <Path
              d="M 212 105 C 225 125, 235 160, 240 195 C 243 215, 248 240, 250 255 C 252 265, 242 270, 238 260 C 232 245, 225 220, 220 195 L 212 140 Z"
              fill="url(#limbGrad)"
            />

            {/* Khung xương chậu / Hông */}
            <Path
              d="M 120 215 L 115 245 L 185 245 L 180 215 Z"
              fill="#BAE6FD"
            />

            {/* Chân trái */}
            <Path
              d="M 115 245 C 112 280, 110 320, 112 350 C 113 375, 108 410, 106 425 C 105 432, 120 435, 124 425 C 128 410, 133 375, 133 350 C 135 320, 140 280, 145 245 Z"
              fill="url(#bodyGrad)"
            />

            {/* Chân phải */}
            <Path
              d="M 185 245 C 188 280, 190 320, 188 350 C 187 375, 192 410, 194 425 C 195 432, 180 435, 176 425 C 172 410, 167 375, 167 350 C 165 320, 160 280, 155 245 Z"
              fill="url(#bodyGrad)"
            />
          </G>

          {/* Vòng lặp hiển thị các Hotspot tương tác */}
          {currentParts.map((part) => {
            const coordX = Number(part.coord_x);
            const coordY = Number(part.coord_y);
            const cx = (coordX / 100) * WIDTH;
            const cy = (coordY / 100) * HEIGHT;
            const selected = getSelectedItem(part.id);
            const color = getHotspotColor(selected);

            return (
              <G key={part.id} onPress={() => onPressPart(part)}>
                {/* Vòng ngoài nếu đã chọn */}
                {selected && (
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={22}
                    fill={color}
                    opacity={0.25}
                  />
                )}

                {/* Vòng tròn chính của Hotspot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={selected ? 14 : 10}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />

                {/* Icon dấu cộng (+) nhỏ ở giữa */}
                <Path
                  d={`M ${cx - 4} ${cy} L ${cx + 4} ${cy} M ${cx} ${cy - 4} L ${cx} ${cy + 4}`}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Chú giải màu sắc mức độ đau */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MedicalColors.primary }]} />
          <Text style={styles.legendText}>Chưa chọn</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MedicalColors.success }]} />
          <Text style={styles.legendText}>Nhẹ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MedicalColors.warning }]} />
          <Text style={styles.legendText}>Vừa</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: MedicalColors.danger }]} />
          <Text style={styles.legendText}>Nghiêm trọng</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: MedicalColors.textSecondary,
  },
  toggleTextActive: {
    color: MedicalColors.primary,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  canvasContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: MedicalColors.textSecondary,
    fontWeight: '500',
  },
});
