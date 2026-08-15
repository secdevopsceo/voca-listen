/**
 * 화면 상태 slice
 *
 * 🚨 단어·단어장 같은 진짜 데이터는 여기에 담지 않는다.
 * 데이터의 주인은 lib/storage(localStorage)이고, 이 slice 는 화면 상태와
 * "데이터가 바뀌었으니 다시 읽어라" 는 신호만 갖는다.
 * (데이터를 양쪽에 두면 어느 쪽이 맞는지 알 수 없어지는 문제를 피한다.)
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** 공부할 범위 — 중요도·난이도 각각의 최소·최대 */
export interface StudyRange {
  importanceMin: number;
  importanceMax: number;
  difficultyMin: number;
  difficultyMax: number;
}

interface UiState {
  /** 단어장 탭에서 고른 단어장. null 이면 전체 */
  currentWordbookId: string | null;
  /** 단어 목록 검색어 */
  keyword: string;
  /** 품사 필터. 빈 문자열이면 전체 */
  partOfSpeech: string;
  /** 난이도 필터. null 이면 전체 */
  difficulty: number | null;
  /** 별표만 보기 */
  onlyStarred: boolean;
  /**
   * 공부할 범위 — 듣기·시험·단어장 목록이 함께 쓴다.
   * null 이면 아직 설정 기본값을 안 읽은 상태라는 뜻이고, 읽고 나면 채워진다.
   * 🚨 저장하지 않는다(계획서 행위 7) — 앱을 다시 열면 설정 기본값으로 돌아온다.
   */
  studyRange: StudyRange | null;
  /**
   * 데이터가 바뀔 때마다 1씩 오르는 값.
   * 화면은 이 값이 바뀌면 storage 에서 다시 읽는다.
   */
  revision: number;
}

const initialState: UiState = {
  currentWordbookId: null,
  keyword: "",
  partOfSpeech: "",
  difficulty: null,
  onlyStarred: false,
  studyRange: null,
  revision: 0,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setCurrentWordbook(state, action: PayloadAction<string | null>) {
      state.currentWordbookId = action.payload;
    },
    setKeyword(state, action: PayloadAction<string>) {
      state.keyword = action.payload;
    },
    setPartOfSpeech(state, action: PayloadAction<string>) {
      state.partOfSpeech = action.payload;
    },
    setDifficulty(state, action: PayloadAction<number | null>) {
      state.difficulty = action.payload;
    },
    setOnlyStarred(state, action: PayloadAction<boolean>) {
      state.onlyStarred = action.payload;
    },
    /** 설정 기본값을 읽어 처음 채우거나, 화면에서 임시로 바꿀 때 부른다 */
    setStudyRange(state, action: PayloadAction<StudyRange>) {
      state.studyRange = action.payload;
    },
    clearFilters(state) {
      state.keyword = "";
      state.partOfSpeech = "";
      state.difficulty = null;
      state.onlyStarred = false;
    },
    /** service 로 데이터를 바꾼 뒤 부른다 — 화면이 다시 읽게 만드는 신호 */
    dataChanged(state) {
      state.revision += 1;
    },
  },
});

export const {
  setCurrentWordbook,
  setKeyword,
  setPartOfSpeech,
  setDifficulty,
  setOnlyStarred,
  setStudyRange,
  clearFilters,
  dataChanged,
} = uiSlice.actions;

export default uiSlice.reducer;
