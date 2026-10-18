import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BattleState, EndlessRecord } from '../logic/controller';
import { formatTime } from '../theme';
import { DefenseButton } from './DefensePrimitives';

type Props = {
  state: BattleState; view: 'help' | 'history' | null; records: EndlessRecord[]; error: string | null; sound: boolean;
  onResume: () => void; onChoose: () => void; onExit: () => void; onOffer: (yes: boolean) => void;
  onClose: () => void; onHistory: () => void; onRetry: () => void; onSound: () => void;
};

export function DefenseOverlay({ state: s, view, records, error, sound, onResume, onChoose, onExit, onOffer, onClose, onHistory, onRetry, onSound }: Props) {
  const { width, height } = useWindowDimensions();
  const compact = width < 380 || height < 700;
  const offer = s.status === 'offer', result = ['won', 'lost', 'exited'].includes(s.status);
  const history = view === 'history', help = view === 'help';
  if (!(offer || result || s.paused || view)) return null;
  const best = records.reduce((max, r) => Math.max(max, r.score), 0);
  const title = history ? 'Lịch sử Vô Tận' : help ? 'Cách bảo vệ thành trì' : offer ? 'Thử thách hoàn thành!' : result
    ? s.status === 'won' ? 'Chiến thắng!' : s.reason === 'exit' ? 'Lượt chơi đã kết thúc' : s.reason === 'timeout' ? 'Đã hết thời gian' : 'Thành trì cần em giúp lại!'
    : 'Trận đấu đã tạm dừng';
  const buttonStyle = compact ? st.smallButton : undefined;

  // A whole-modal fade makes even solid backgrounds translucent while opening.
  // Only the separate scrim is translucent; the dialog appears at full opacity.
  return <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={onClose}>
    <SafeAreaView style={st.backdrop} edges={['top', 'bottom', 'left', 'right']} testID="energy-dialog" pointerEvents="auto">
      <View style={[st.card, compact && st.compactCard]} testID="energy-dialog-card" accessibilityViewIsModal>
        <View style={[st.header, compact && st.compactPadding]}>
          <Text style={st.eyebrow}>{history ? 'THÀNH TÍCH TRÊN THIẾT BỊ' : s.endless ? 'CHẾ ĐỘ VÔ TẬN' : 'PHÁO ĐÀI PHA LÊ'}</Text>
          <Text accessibilityRole="header" style={[st.title, compact && st.compactTitle]}>{title}</Text>
        </View>
        <ScrollView style={st.scroll} contentContainerStyle={[st.content, compact && st.compactPadding]} showsVerticalScrollIndicator>
          {offer ? <>
            <Text style={st.copy}>Bạn đã hoàn thành chế độ Thử thách! Bạn có muốn tiếp tục vào Chế độ Vô Tận không?</Text>
            <Text style={st.note}>Giữ {s.hp} HP hiện tại. Điểm và thời lượng Vô Tận bắt đầu từ 0.</Text>
          </> : history ? <>
            <View style={st.best}><Text style={st.bestLabel}>THÀNH TÍCH CAO NHẤT</Text><Text style={st.big}>{best} điểm</Text></View>
            {records.length === 0 && !error && <Text style={st.copy}>Chưa có lượt Vô Tận đã kết thúc. Hãy hoàn thành 7 chặng Thử thách để mở hành trình này.</Text>}
            {records.map(r => <View key={r.id} style={st.record} testID="energy-history-record">
              <Text style={st.recordTitle}>{r.score} điểm</Text>
              <Text style={st.copy}>{r.kills} quái · Hoàn thành chặng {r.completedWave}</Text>
              <Text style={st.copy}>Thời gian chơi: {formatTime(r.durationSeconds)}</Text>
              <Text style={st.date}>Ngày chơi: {new Date(r.playedAt).toLocaleString('vi-VN')}</Text>
              <Text style={st.date}>{r.reason === 'exit' ? 'Chủ động kết thúc' : 'Căn cứ thất thủ'}</Text>
            </View>)}
          </> : help ? <Text style={st.copy}>1. Đọc mục tiêu, chọn các pha lê để tổng bằng đúng giá trị đó.{ '\n\n' }2. Nhấn KHAI HỎA để hạ một quái. Mọi tổ hợp đúng đều được chấp nhận.{ '\n\n' }3. Quái tự xuất hiện theo nhịp. Quái tới thành trì sẽ trừ 15 HP. Hoàn thành tất cả chặng trước 6 phút; Vô Tận tiếp tục đến khi thua hoặc thoát.{ '\n\n' }Trong Vô Tận, mỗi quái hạ được mang lại 10 điểm.</Text>
            : result ? <View style={st.results}>{[
              [s.endless ? 'Điểm vô tận' : 'Điểm năng lượng', s.endless ? s.endlessScore : s.score],
              ['Quái tiêu diệt', s.endless ? s.endlessKills : s.kills],
              [s.endless ? 'Chặng đã hoàn thành' : 'Câu trả lời đúng', s.endless ? s.endlessCompleted : s.correct],
              ['Thời lượng', formatTime(s.endless ? s.endlessSeconds : s.elapsedSeconds)],
            ].map(([label, value]) => <View key={label} style={st.stat}><Text style={st.big}>{value}</Text><Text style={st.copy}>{label}</Text></View>)}</View>
              : <Text style={st.copy}>Chiến trường và bài toán được ẩn khi tạm dừng. Tiến trình được giữ nguyên.</Text>}
          {error && <View accessibilityLiveRegion="polite" style={st.error}><Text style={st.copy}>{error}</Text><DefenseButton label="THỬ LẠI LƯU / ĐỌC LỊCH SỬ" tone="secondary" onPress={onRetry}/></View>}
        </ScrollView>
        <View style={[st.footer, compact && st.compactPadding]}>
          {offer ? <><DefenseButton testID="energy-endless-yes" label="CÓ — TIẾP TỤC" style={buttonStyle} onPress={() => onOffer(true)}/><DefenseButton testID="energy-endless-no" label="KHÔNG — KẾT THÚC" tone="secondary" style={buttonStyle} onPress={() => onOffer(false)}/></>
            : history ? <DefenseButton testID="energy-history-close" label="ĐÓNG LỊCH SỬ" style={buttonStyle} onPress={onClose}/>
              : help ? <DefenseButton label="TIẾP TỤC CHƠI" style={buttonStyle} onPress={onResume}/>
                : result ? <><DefenseButton testID="energy-choose-again" label="CHỌN CHẾ ĐỘ" style={buttonStyle} onPress={onChoose}/><DefenseButton label="LỊCH SỬ VÔ TẬN" tone="quiet" style={buttonStyle} onPress={onHistory}/><DefenseButton label="VỀ SẢNH" tone="quiet" style={buttonStyle} onPress={onExit}/></>
                  : <><DefenseButton testID="energy-resume" label="TIẾP TỤC CHƠI" icon="play" style={buttonStyle} onPress={onResume}/><DefenseButton label={sound ? 'TẮT ÂM THANH' : 'BẬT ÂM THANH'} tone="quiet" style={buttonStyle} onPress={onSound}/><DefenseButton label="CHỌN LẠI CHẾ ĐỘ" tone="secondary" style={buttonStyle} onPress={onChoose}/><DefenseButton label="THOÁT VỀ SẢNH" tone="quiet" style={buttonStyle} onPress={onExit}/></>}
        </View>
      </View>
    </SafeAreaView>
  </Modal>;
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,30,32,0.76)', padding: 16, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 520, maxHeight: '100%', flexShrink: 1, backgroundColor: '#FCFCF1', borderWidth: 2, borderColor: '#BCC9A6', borderRadius: 24, overflow: 'hidden' },
  compactCard: { borderRadius: 18 },
  header: { padding: 22, paddingBottom: 16, gap: 9, borderBottomWidth: 1, borderColor: '#DCE3CF', backgroundColor: '#FCFCF1' },
  title: { fontSize: 26, lineHeight: 33, fontWeight: '900', color: '#254D40', textAlign: 'center' },
  compactTitle: { fontSize: 22, lineHeight: 28 },
  eyebrow: { color: '#5C704D', fontSize: 10, lineHeight: 15, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { padding: 22, gap: 14 },
  footer: { padding: 22, gap: 10, flexShrink: 0, borderTopWidth: 1, borderColor: '#DCE3CF', backgroundColor: '#FCFCF1' },
  compactPadding: { padding: 14 },
  smallButton: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 9 },
  copy: { fontSize: 14, lineHeight: 21, color: '#475C43', flexShrink: 1 },
  note: { backgroundColor: '#EFF1DF', borderRadius: 10, padding: 12, color: '#4E5C34', fontSize: 13, lineHeight: 20 },
  best: { padding: 16, borderRadius: 13, backgroundColor: '#F6E8BA', alignItems: 'center', gap: 6 },
  bestLabel: { color: '#735B24', fontSize: 11, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  big: { fontSize: 25, lineHeight: 32, fontWeight: '900', color: '#286347' },
  record: { borderBottomWidth: 1, borderColor: '#DCE3CF', paddingBottom: 14, gap: 3 },
  recordTitle: { color: '#28553E', fontWeight: '900', fontSize: 20, lineHeight: 26 },
  date: { color: '#53664B', fontSize: 12, lineHeight: 18 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '47%', flexGrow: 1, minWidth: 0, alignItems: 'center', padding: 12, backgroundColor: '#EBEFDE', borderRadius: 12 },
  error: { padding: 10, borderRadius: 10, backgroundColor: '#FFF0DD', gap: 9 },
});
