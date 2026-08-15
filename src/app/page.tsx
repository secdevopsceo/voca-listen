import { redirect } from "next/navigation";

/** 첫 화면은 단어장 탭 */
export default function RootPage() {
  redirect("/ui/wordbooks");
}
