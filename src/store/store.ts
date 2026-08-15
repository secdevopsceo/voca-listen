/**
 * Redux store
 *
 * 🚨 persist 로 남기는 것은 화면 상태(고른 단어장·필터)뿐이다.
 * 단어·학습 기록 같은 진짜 데이터는 lib/storage 가 자기 키에 따로 저장하므로
 * 여기에 담아 두 벌로 만들지 않는다.
 *
 * 🚨 담는 값의 모양이 바뀌면 version 을 올리고 아래 migrations 에 항목을 추가한다.
 * insight-sbom 에서 낡은 저장분이 조용히 되살아나 화면이 죽은 사고가 있었고,
 * version 만 올리면 createMigrate 가 후보를 못 찾아 원본을 그대로 돌려주므로
 * 반드시 키를 함께 넣어야 한다.
 */

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
} from "redux-persist";
import storage from "./storage";
import uiReducer from "./slice/uiSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
});

/** 낡은 저장분은 복구하지 않고 버린다(undefined 를 주면 초기값으로 시작한다) */
const migrations = {
  // 첫 버전이라 아직 옮길 것이 없다. 모양이 바뀌면 여기에 다음 번호를 추가한다.
};

const persistedReducer = persistReducer(
  {
    key: "voca-listen-ui",
    version: 1,
    storage,
    // 화면 상태만 남긴다 — revision 은 남길 이유가 없다
    whitelist: ["ui"],
    migrate: createMigrate(migrations),
  },
  rootReducer,
);

export const makeStore = () =>
  configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
