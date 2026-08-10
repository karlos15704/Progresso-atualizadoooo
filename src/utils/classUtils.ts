export function getFilteredClasses(
  userProfile: any,
  schoolClasses: string[],
  studentsDB?: Record<string, { name: string; classId: string }[]>,
): string[] {
  if (!userProfile) return [];
  const roles = (userProfile.role || "professor")
    .split(",")
    .map((r: string) => r.trim());
  const isMaster = [
    "cps@cps.local",
    "karlos15704@gmail.com",
    "ti@cps.local",
  ].includes(userProfile.email?.toLowerCase());

  const hasSecretariaRole = roles.some((r: string) =>
    r.toLowerCase().includes("secretaria"),
  );
  const hasDiretoriaRole = roles.some(
    (r: string) =>
      r.toLowerCase().includes("diretor") ||
      r.toLowerCase().includes("diretoria"),
  );

  let allSchoolClasses = [...schoolClasses];
  if (studentsDB) {
    try {
      const dbClasses = new Set<string>();
      Object.values(studentsDB).forEach((students: any[]) => {
        students.forEach((s: any) => {
          if (s.classId) dbClasses.add(s.classId);
        });
      });
      if (dbClasses.size > 0) {
        allSchoolClasses = Array.from(dbClasses);
      }
    } catch (err) {
      console.error("Error getting all classes from studentsDB:", err);
    }
  }

  let classes: string[] = [];
  const isSuperAdminOrStaff =
    roles.includes("admin") ||
    roles.includes("vice_diretor") ||
    isMaster ||
    roles.includes("coordenador_all") ||
    roles.includes("secretaria_all") ||
    hasSecretariaRole ||
    hasDiretoriaRole;

  if (isSuperAdminOrStaff) {
    classes = [...allSchoolClasses];
  } else if (roles.includes("coordenador_fund1")) {
    classes = allSchoolClasses.filter((c: string) => /^[1-5]/.test(c));
  } else if (roles.includes("coordenador_fund2")) {
    classes = allSchoolClasses.filter((c: string) => /^[6-9]/.test(c));
  } else if (roles.includes("professor")) {
    classes = userProfile.assigned_classes || [];
  } else {
    classes = userProfile.assigned_classes || [];
  }

  return [...classes].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}
