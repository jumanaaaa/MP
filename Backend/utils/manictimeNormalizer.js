function normalizeManicTimeEntities(entities) {
  return entities
    .map(e => {
      const values = e.values || {};
      const interval = values.timeInterval || {};

      return {
        name: values.name || "Unknown",
        start: new Date(interval.start),
        duration: interval.duration || 0,
        groupId: values.groupId ?? null
      };
    })
    .filter(a => {
      if (!a.duration || a.duration <= 0) return false;

      const name = a.name.toLowerCase();

      // ❌ filter out system/state noise
      const blocked = [
        "active",
        "away",
        "session lock",
        "power off",
        "manictime"
      ];

      return !blocked.some(b => name === b);
    });
}

module.exports = { normalizeManicTimeEntities };
