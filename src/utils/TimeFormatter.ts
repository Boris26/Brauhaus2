export  class TimeFormatter {
  static seconds(aSeconds: number): string {
      const minutes = Math.floor(aSeconds / 60);
      const remainingSeconds = aSeconds % 60;
      const roundedSeconds = Math.floor(remainingSeconds);
      const formattedTime = `${minutes}:${roundedSeconds.toString().padStart(2, '0')}`;
      return formattedTime;
  }
}
