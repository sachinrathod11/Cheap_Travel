// Use only after mounting for render defaults. The server cannot know the
// browser's local calendar date; SSR and the first client render stay empty.
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
