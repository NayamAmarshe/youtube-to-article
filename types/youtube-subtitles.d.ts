declare module "@suejon/youtube-subtitles" {
  interface SubtitleItem {
    start: number;
    dur: number;
    text: string;
  }

  export function get_subtitles_for_video(
    videoId: string,
    language?: string
  ): Promise<SubtitleItem[]>;
  export function get_available_languages(videoId: string): Promise<string[]>;
}
