import { redirect } from "next/navigation";

export default async function SecurityAppHome() {
  redirect("/security-app/validate");
}
