import type { MetadataRoute } from "next";

/**
 * PWA manifest — 휴대폰 홈화면에 설치될 때 쓰는 정보.
 * 색은 globals.css 의 테마 색과 맞춘다(라이트 바탕 · 앰버 강조).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "voca-listen — 들으면서 외우는 단어장",
    short_name: "voca-listen",
    description: "영어·일본어·프랑스어 단어를 소리로 들으며 외우고 시험까지 보는 개인 단어장",
    start_url: "/ui/wordbooks",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F2EA",
    theme_color: "#B4531F",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
