function normalizeManicTimeEntities(entities) {
  const IGNORED_NAMES = [
    "Active",
    "Away",
    "Session lock",
    "Power off",
    "Idle"
  ];

  return entities
    .filter(e => e.entityType === "activity")
    .map(e => {
      const { name, timeInterval, groupId } = e.values || {};
      if (!name || !timeInterval) return null;

      return {
        name: name.trim(),
        start: new Date(timeInterval.start),
        duration: parseInt(timeInterval.duration, 10),
        groupId: groupId || null
      };
    })
    .filter(e =>
      e &&
      e.duration >= 60 &&                     // ⏱ at least 1 minute
      !IGNORED_NAMES.includes(e.name)          // 🚫 no system noise
    );
}

module.exports = { normalizeManicTimeEntities };
