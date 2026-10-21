import { studyDayOf } from "../../domain/time/studyDay.ts";
import { db } from "../../data/db/instance.ts";

/** Creează un backup al progresului și îl descarcă ca fișier JSON. Returnează momentul backup-ului. */
export async function downloadBackup(dataVersion: string): Promise<Date> {
  const { backupToJson, exportBackup } = await import("../../data/backup/backup.ts");
  const now = new Date();
  const json = backupToJson(await exportBackup(db, dataVersion, now));
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `impara-backup-${studyDayOf(now)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return now;
}
