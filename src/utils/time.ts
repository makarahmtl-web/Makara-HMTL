/**
 * Dynamic Khmer Relative Time Formatter
 * Formats timestamps dynamically into Khmer relative expressions (e.g. "1 វិនាទីមុន", "5 នាទីមុន", "2 ម៉ោងមុន", "ម្សិលមិញ", "1 ថ្ងៃមុន")
 */
export function formatKhmerRelativeTime(dateInput: any): string {
  if (!dateInput) return "ទើបតែឥឡូវនេះ";

  let date: Date;

  try {
    if (typeof dateInput?.toDate === "function") {
      date = dateInput.toDate();
    } else if (typeof dateInput === "object" && "seconds" in dateInput) {
      date = new Date(dateInput.seconds * 1000);
    } else if (typeof dateInput === "string" || typeof dateInput === "number") {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return "ទើបតែឥឡូវនេះ";
    }

    if (isNaN(date.getTime())) {
      return "ទើបតែឥឡូវនេះ";
    }
  } catch {
    return "ទើបតែឥឡូវនេះ";
  }

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 10) {
    return "ទើបតែឥឡូវនេះ";
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds} វិនាទីមុន`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} នាទីមុន`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ម៉ោងមុន`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "ម្សិលមិញ";
  }
  if (diffInDays < 7) {
    return `${diffInDays} ថ្ងៃមុន`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} សប្តាហ៍មុន`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ខែមុន`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ឆ្នាំមុន`;
}

/**
 * Check if a timestamp is within the last 24 hours
 */
export function isWithin24Hours(dateInput: any): boolean {
  if (!dateInput) return true;
  try {
    let date: Date;
    if (typeof dateInput?.toDate === "function") {
      date = dateInput.toDate();
    } else if (typeof dateInput === "object" && "seconds" in dateInput) {
      date = new Date(dateInput.seconds * 1000);
    } else if (typeof dateInput === "string" || typeof dateInput === "number") {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return true;
    }

    if (isNaN(date.getTime())) return true;
    const diffMs = Date.now() - date.getTime();
    return diffMs < 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}
