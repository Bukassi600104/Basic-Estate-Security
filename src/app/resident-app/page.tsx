import { redirect } from "next/navigation";

export default async function ResidentAppHome() {
  redirect("/resident-app/codes");
}
