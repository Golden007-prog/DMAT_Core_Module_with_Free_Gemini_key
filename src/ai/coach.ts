import type { Question } from '../engine/types';

/** G2/G3 implementations arrive with the Gemini layer (M6). Until then the
 *  UI gates on the key being present, so this path is unreachable — but it
 *  must still fail softly, never loudly. */
export async function explainMistake(question: Question, userAnswer: unknown): Promise<string> {
  void question;
  void userAnswer;
  throw new Error('AI layer not configured');
}
