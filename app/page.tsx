import { YouTubeForm } from "@/components/youtube-form";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="sr-only">
        <h1>YouTube to Article Generator</h1>
        <p>Transform YouTube videos into beautifully formatted articles</p>
      </header>
      <YouTubeForm />
    </main>
  );
}
