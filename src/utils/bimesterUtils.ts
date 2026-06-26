export function getBimesterForDate(dateStr: string | undefined | null, bimesterDates: any): string | null {
  if (!dateStr || !bimesterDates) return null;
  
  // Normalize date string (e.g., YYYY-MM-DD or full ISO string)
  const dateOnly = dateStr.split("T")[0];
  const targetDate = new Date(dateOnly + "T12:00:00"); 
  if (isNaN(targetDate.getTime())) return null;

  const bimesters = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  for (const bimesterName of bimesters) {
    const dates = bimesterDates[bimesterName];
    if (dates && dates.startDate && dates.endDate) {
      const start = new Date(dates.startDate + "T00:00:00");
      const end = new Date(dates.endDate + "T23:59:59");
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (targetDate >= start && targetDate <= end) {
          return bimesterName;
        }
      }
    }
  }
  return null;
}

export function getBimesterForExam(exam: { bimester?: string; examDate?: string } | null | undefined, bimesterDates: any): string {
  if (exam && exam.bimester) {
    return exam.bimester;
  }
  if (exam && exam.examDate && bimesterDates) {
    const matched = getBimesterForDate(exam.examDate, bimesterDates);
    if (matched) return matched;
  }
  return "1º Bimestre";
}
