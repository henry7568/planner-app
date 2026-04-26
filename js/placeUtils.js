export function getLocationPayload(inputEl, addressEl, placeIdEl) {
  return {
    location: inputEl?.value || "",
    locationAddress: addressEl?.value || "",
    locationPlaceId: placeIdEl?.value || "",
  };
}

export function isMultiDayScheduleRange(startDate, endDate) {
  if (!startDate || !endDate) return false;
  return startDate !== endDate;
}

export function getPrimaryLocationFromDailyLocations(dailyLocations) {
  if (!Array.isArray(dailyLocations) || dailyLocations.length === 0) {
    return {
      location: "",
      locationAddress: "",
      locationPlaceId: "",
    };
  }

  const sorted = [...dailyLocations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const first = sorted[0] || {};

  return {
    location: first.label || "",
    locationAddress: first.address || "",
    locationPlaceId: first.placeId || "",
  };
}

export function normalizeDailyLocationEntries(entries, startDate, endDate) {
  if (!Array.isArray(entries)) return [];

  const map = new Map();

  entries.forEach((entry) => {
    if (!entry || !entry.date) return;
    if (startDate && entry.date < startDate) return;
    if (endDate && entry.date > endDate) return;

    map.set(entry.date, {
      date: entry.date,
      label: entry.label || "",
      address: entry.address || "",
      placeId: entry.placeId || "",
    });
  });

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getEffectiveDailyLocationForDate(dailyLocations, dateKey) {
  if (
    !Array.isArray(dailyLocations) ||
    dailyLocations.length === 0 ||
    !dateKey
  ) {
    return null;
  }

  const sorted = [...dailyLocations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  let current = null;

  for (const entry of sorted) {
    if (entry.date <= dateKey) {
      current = entry;
      continue;
    }
    break;
  }

  return current;
}
