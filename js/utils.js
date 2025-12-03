// MARK: - Utility Functions
// 汎用的なヘルパー関数

// 分(number)を "HH:MM" 形式の文字列に変換
export function minToTime(m) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}