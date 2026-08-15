/**
 * 글로비시 시드 데이터 로더
 *
 * 1500단어와 예문은 첫 실행 때 한 번만 필요하므로, 앱 첫 화면 번들에 얹지 않고
 * 필요한 순간에 따로 불러온다(초기 로딩을 무겁게 하지 않기 위해).
 */

/** globish-words.json 한 줄 */
export interface GlobishWord {
  word: string;
  meaning: string;
  category: string;
  difficulty: number;
}

/** globish-sentences.json 한 줄 */
export interface GlobishSentence {
  word: string;
  sentence: string;
  sentenceMeaning: string;
}

/** globish-ranks.json 한 줄 — 단어별 중요도·난이도 */
export interface GlobishRank {
  importance: number;
  difficulty: number;
}

/** 단어에 예문을 붙인 시드 한 줄 */
export interface GlobishSeedRow {
  term: string;
  meaning: string;
  partOfSpeech: string;
  difficulty: number;
  importance: number;
  example: string;
  exampleMeaning: string;
}

/** 글로비시 단어 + 예문 + 등급을 합쳐 시드용 목록으로 만든다 */
export async function loadGlobishSeed(): Promise<GlobishSeedRow[]> {
  const [wordsModule, sentencesModule, ranksModule] = await Promise.all([
    import("./globish-words.json"),
    import("./globish-sentences.json"),
    import("./globish-ranks.json"),
  ]);

  const words = wordsModule.default as GlobishWord[];
  const sentences = sentencesModule.default as GlobishSentence[];
  const ranks = ranksModule.default as Record<string, GlobishRank>;

  // 단어 하나에 예문이 여러 개면 첫 번째만 쓴다
  const sentenceMap = new Map<string, GlobishSentence>();
  for (const sentence of sentences) {
    if (!sentenceMap.has(sentence.word)) {
      sentenceMap.set(sentence.word, sentence);
    }
  }

  return words.map((word) => {
    const sentence = sentenceMap.get(word.word);
    // 등급표에 없는 단어는 중간값으로 둔다(계획서 8장 — 안 매겨진 것은 3)
    const rank = ranks[word.word] ?? { importance: 3, difficulty: 3 };
    return {
      term: word.word,
      meaning: word.meaning,
      partOfSpeech: word.category ?? "",
      difficulty: normalizeGrade(rank.difficulty),
      importance: normalizeGrade(rank.importance),
      example: sentence?.sentence ?? "",
      exampleMeaning: sentence?.sentenceMeaning ?? "",
    };
  });
}

/** 중요도·난이도는 1~5 범위로 맞춘다 */
function normalizeGrade(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(Math.max(Math.round(value), 1), 5);
}
