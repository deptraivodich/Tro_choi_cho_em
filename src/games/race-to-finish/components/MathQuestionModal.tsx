import { RaceModal } from './RaceModal';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, cancelAnimation, runOnJS } from 'react-native-reanimated';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { RaceQuestion, answerText } from '../logic/questions';
import { Player } from '../types/index';
import { QUESTION_TIME_LIMIT_MS } from '../state/turnTiming';

interface Props {
  question: RaceQuestion; player: Player; dice: number; submittedAnswer: string | null;
  correct: boolean | null; paused: boolean; onAnswer: (input: string) => void;
  failure: 'incorrect' | 'timeout' | null;
  onAcknowledge: () => void; getTimeRemaining: () => number;
  closing: boolean; actionId: number; onDismissed: (id: number) => void;
}
export function MathQuestionModal({ question, player, dice, submittedAnswer, correct, failure, paused, onAnswer,
  onAcknowledge, getTimeRemaining, closing, actionId, onDismissed }: Props) {
  const opacity = useSharedValue(1);
  const latest = useRef({ closing, paused, actionId, onDismissed });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useLayoutEffect(() => { latest.current = { closing, paused, actionId, onDismissed }; }, [closing, paused, actionId, onDismissed]);
  const finish = (id: number) => {
    const current = latest.current;
    if (mounted.current && current.closing && !current.paused && current.actionId === id) current.onDismissed(id);
  };
  useEffect(() => {
    cancelAnimation(opacity);
    if (closing && !paused) opacity.set(withTiming(0, { duration: 180 * opacity.value }, completed => {
      if (completed) runOnJS(finish)(actionId);
    }));
    return () => cancelAnimation(opacity);
  }, [closing, paused, actionId, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const [input, setInput] = useState('');
  const [remaining, setRemaining] = useState(QUESTION_TIME_LIMIT_MS);
  useEffect(() => {
    const refresh = () => setRemaining(getTimeRemaining());
    refresh();
    if (correct !== null || paused) return;
    // Display only: the controller owns the deadline and timeout event.
    const ticker = setInterval(refresh, 100);
    return () => clearInterval(ticker);
  }, [question.key, correct, paused, getTimeRemaining]);
  const seconds = Math.ceil(remaining / 1000);
  const locked = correct !== null || player.isBot || paused;
  const submit = () => { if (!locked && input.trim()) onAnswer(input); };
  return (
    <RaceModal transparent visible animationType="fade" onRequestClose={() => {}}>
      <Animated.View testID="math-feedback-layer" style={[StyleSheet.absoluteFill, fade]}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollContent} contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Thử thách Toán lớp 5</Text>
          <Text style={styles.caption}>{player.name} • Xúc xắc {dice} • {question.difficulty === 'challenge' ? 'Chặng cuối: vận dụng' : 'Chặng đầu: luyện tập'}</Text>
          <View style={styles.timerSection}>
            <Text testID="question-time-left" style={styles.timerText}>
              {paused ? 'Tạm dừng • ' : ''}Còn {seconds} giây
            </Text>
            <View testID="question-countdown" accessibilityRole="progressbar" accessibilityLabel="Thời gian trả lời"
              accessibilityValue={{ min: 0, max: 30, now: seconds }} style={styles.timerTrack}>
              <View style={[styles.timerFill, { width: `${remaining / QUESTION_TIME_LIMIT_MS * 100}%`,
                backgroundColor: seconds <= 5 ? '#DC2626' : '#059669' }]} />
            </View>
          </View>
          <Text style={styles.prompt} testID="math-prompt">{question.prompt}</Text>
          {correct === null && (question.choices ? <View style={styles.choices}>{question.choices.map(choice => (
            <TouchableOpacity key={choice} accessibilityRole="button" disabled={locked} onPress={() => onAnswer(choice)} style={styles.choice}>
              <Text style={styles.choiceText}>{choice}</Text>
            </TouchableOpacity>
          ))}</View> : <>
            <Text style={styles.hint}>{question.unit ? `Nhập phần số; đơn vị: ${question.unit}.` : 'Nhập số hoặc phân số, ví dụ 0,5 hoặc 1/2.'}</Text>
            <TextInput testID="math-answer-input" accessibilityLabel="Đáp án toán" value={input} onChangeText={setInput}
              editable={!locked} autoCorrect={false} keyboardType="default" returnKeyType="done" onSubmitEditing={submit}
              style={styles.input} placeholder="Đáp án của em" />
            <TouchableOpacity testID="math-submit" accessibilityRole="button" disabled={locked || !input.trim()} onPress={submit}
              style={[styles.submit, (locked || !input.trim()) && styles.disabled]}><Text style={styles.submitText}>XÁC NHẬN</Text></TouchableOpacity>
          </>)}
          {player.isBot && correct === null && <Text style={styles.feedback}>Máy đang suy nghĩ...</Text>}
          {correct !== null && <View testID="math-feedback" style={[styles.feedbackBox, correct ? styles.correct : styles.incorrect]}>
            <Text style={styles.feedback}>{correct ? `Đúng rồi! Được đi ${dice} ô.` : failure === 'timeout'
              ? 'Đã hết thời gian, sau đây là đáp án và cách giải.' : 'Không đúng, sau đây là đáp án và cách giải.'}</Text>
            <Text style={styles.explanation}>Đã trả lời: {submittedAnswer || 'Chưa trả lời'}{'\n'}Đáp án: {answerText(question)} {question.unit ?? ''}{'\n'}Cách giải: {question.explanation}</Text>
          </View>}
        </ScrollView>
          {correct === false && !player.isBot && <TouchableOpacity testID="math-understood" accessibilityRole="button"
            disabled={paused} onPress={onAcknowledge} style={[styles.submit, styles.acknowledge, paused && styles.disabled]}>
            <Text style={styles.submitText}>Đã hiểu</Text>
          </TouchableOpacity>}
        </View>
      </KeyboardAvoidingView>
      </Animated.View>
    </RaceModal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  card: { width: '100%', maxWidth: 680, maxHeight: '94%', flexGrow: 0, backgroundColor: '#FFFBEB', borderRadius: 24, borderWidth: 3, borderColor: '#F59E0B' },
  scrollContent: { flexGrow: 0, flexShrink: 1 }, acknowledge: { marginHorizontal: 20, marginBottom: 16 },
  content: { padding: 12, gap: 8 }, heading: { fontSize: 23, fontWeight: '900', color: '#065F46', textAlign: 'center' },
  caption: { fontSize: 14, color: '#92400E', textAlign: 'center' }, prompt: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: '#1F2937' },
  hint: { fontSize: 15, color: '#4B5563' }, input: { minHeight: 54, fontSize: 23, borderWidth: 2, borderColor: '#D97706', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  submit: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#059669', borderRadius: 12 }, disabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 18 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  choice: { minWidth: 64, minHeight: 56, backgroundColor: '#D1FAE5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 28, fontWeight: '800', color: '#065F46' }, feedbackBox: { padding: 12, borderRadius: 12 },
  correct: { backgroundColor: '#D1FAE5' }, incorrect: { backgroundColor: '#FEE2E2' }, feedback: { fontWeight: '800', fontSize: 18, color: '#064E3B' },
  explanation: { fontSize: 16, lineHeight: 24, marginTop: 8, color: '#374151' },
  timerSection: { gap: 6 }, timerText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  timerTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#FDE68A' },
  timerFill: { height: '100%', borderRadius: 5 },
});
