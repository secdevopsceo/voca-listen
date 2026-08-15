/**
 * 백업 파일 공유 스키마
 * 가져오기 전에 파일 전체를 검사해, 형식이 맞지 않으면 한 줄도 넣지 않는다
 * (계획서 행위 13 의 "절반만 들어가는 상태를 만들지 않는다").
 */

import { z } from "zod";
import { langCodeSchema } from "./wordbook";

/** 이 앱이 만든 백업 파일임을 알아보는 표시 */
export const BACKUP_FORMAT = "voca-listen-backup";
export const BACKUP_VERSION = 1;

const isoDateString = z.string().min(1);

const wordbookRowSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  deletedAt: isoDateString.nullable(),
  name: z.string().min(1),
  lang: langCodeSchema,
  isDefault: z.boolean(),
  // 옛 백업 파일에는 없으므로 없으면 0 으로 본다(가져올 때 맨 왼쪽 자리를 새로 받는다)
  sortOrder: z.number().int().default(0),
});

const wordRowSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  deletedAt: isoDateString.nullable(),
  wordbookId: z.string().min(1),
  term: z.string().min(1),
  meaning: z.string(),
  reading: z.string(),
  example: z.string(),
  exampleMeaning: z.string(),
  partOfSpeech: z.string(),
  difficulty: z.number().int(),
  // 옛 백업 파일에는 없으므로 없으면 「보통」으로 본다(계획서 6-2)
  importance: z.number().int().default(3),
  memo: z.string(),
  starred: z.boolean(),
});

const wordRecordRowSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  deletedAt: isoDateString.nullable(),
  wordId: z.string().min(1),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
  unknownCount: z.number().int().min(0),
  lastTestedAt: isoDateString.nullable(),
  reviewStage: z.number().int().min(0),
  nextReviewAt: isoDateString.nullable(),
});

const quizResultRowSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  deletedAt: isoDateString.nullable(),
  wordbookId: z.string().nullable(),
  mode: z.enum(["see", "listen", "example"]),
  totalCount: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
  unknownCount: z.number().int().min(0),
  finishedAt: isoDateString,
});

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  exportedAt: isoDateString,
  wordbooks: z.array(wordbookRowSchema),
  words: z.array(wordRowSchema),
  wordRecords: z.array(wordRecordRowSchema).optional(),
  quizResults: z.array(quizResultRowSchema).optional(),
});

export type BackupFile = z.infer<typeof backupFileSchema>;

/** 같은 단어를 만났을 때 어떻게 할지 */
export const importConflictModeSchema = z.enum(["skip", "overwrite"]);
export type ImportConflictMode = z.infer<typeof importConflictModeSchema>;
