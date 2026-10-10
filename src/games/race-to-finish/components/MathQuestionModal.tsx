import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { RaceQuestion, answerText } from '../logic/questions';
import { Player } from '../types/index';

interface Props {
  question: RaceQuestion; player: Player; dice: number; submittedAnswer: string | null;
  correct: boolean | null; paused: boolean; onAnswer: (input: string) => void;
}
export function MathQuestionModal({ question, player, dice, submittedAnswer, correct, paused, onAnswer }: Props) {
  const [input, setInput] = useState('');
  const locked = submittedAnswer !== null || player.isBot || paused;
  const submit = () => { if (!locked && input.trim()) onAnswer(input); };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.card} contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Thử thách Toán lớp 5</Text>
          <Text style={styles.caption}>{player.name} • Xúc xắc {dice} • {question.difficulty === 'challenge' ? 'Chặng cuối: vận dụng' : 'Chặng đầu: luyện tập'}</Text>
          <Text style={styles.prompt} testID="math-prompt">{question.prompt}</Text>
          {question.choices ? <View style={styles.choices}>{question.choices.map(choice => (
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
          </>}
          {player.isBot && correct === null && <Text style={styles.feedback}>Máy đang suy nghĩ...</Text>}
          {correct !== null && <View testID="math-feedback" style={[styles.feedbackBox, correct ? styles.correct : styles.incorrect]}>
            <Text style={styles.feedback}>{correct ? `Đúng rồi! Được đi ${dice} ô.` : 'Chưa đúng. Lượt này đứng nguyên vị trí.'}</Text>
            <Text style={styles.explanation}>Đã trả lời: {submittedAnswer}{'\n'}Đáp án đúng: {answerText(question)} {question.unit ?? ''}{'\n'}{question.explanation}</Text>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  card: { width: '100%', maxWidth: 520, maxHeight: '90%', flexGrow: 0, backgroundColor: '#FFFBEB', borderRadius: 24, borderWidth: 3, borderColor: '#F59E0B' },
  content: { padding: 20, gap: 14 }, heading: { fontSize: 23, fontWeight: '900', color: '#065F46', textAlign: 'center' },
  caption: { fontSize: 14, color: '#92400E', textAlign: 'center' }, prompt: { fontSize: 23, lineHeight: 34, fontWeight: '700', color: '#1F2937' },
  hint: { fontSize: 15, color: '#4B5563' }, input: { minHeight: 54, fontSize: 23, borderWidth: 2, borderColor: '#D97706', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  submit: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#059669', borderRadius: 12 }, disabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 18 }, choices: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  choice: { minWidth: 64, minHeight: 56, backgroundColor: '#D1FAE5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 28, fontWeight: '800', color: '#065F46' }, feedbackBox: { padding: 12, borderRadius: 12 },
  correct: { backgroundColor: '#D1FAE5' }, incorrect: { backgroundColor: '#FEE2E2' }, feedback: { fontWeight: '800', fontSize: 18, color: '#064E3B' },
  explanation: { fontSize: 16, lineHeight: 24, marginTop: 8, color: '#374151' },
});
