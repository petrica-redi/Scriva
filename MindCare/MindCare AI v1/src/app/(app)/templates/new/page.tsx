import { redirect } from "next/navigation";

export default function NewTemplateRedirect() {
  redirect("/templates/new/edit");
}
