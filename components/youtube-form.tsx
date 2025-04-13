"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { get_subtitles_for_video } from "@suejon/youtube-subtitles";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BlurryBackground } from "./blurry-background";

export function YouTubeForm() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");
  const [isUsingDefaultKey, setIsUsingDefaultKey] = useState(true);
  const defaultKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  useEffect(() => {
    // Load API key from localStorage on mount
    const savedApiKey = localStorage.getItem("geminiApiKey");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsUsingDefaultKey(false);
    } else {
      setApiKey("");
      setIsUsingDefaultKey(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setArticle("");

    try {
      const keyToUse = isUsingDefaultKey ? defaultKey : apiKey;
      if (!keyToUse) {
        throw new Error("Please enter your Gemini API key");
      }

      // Extract video ID from URL
      const videoId = url.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      )?.[1];

      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // Get subtitles directly in the browser
      const subtitles = await get_subtitles_for_video(videoId);
      if (!subtitles || subtitles.length === 0) {
        throw new Error("No subtitles found for this video");
      }
      const transcript = subtitles.map((item: { text: string }) => item.text).join(" ");

      // Generate article using Gemini
      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Convert the following lecture transcript into a well-structured article in markdown format. The transcript is a lecture on a specific topic and might have some technical terms and jargon that are not transcribed correctly, so make sure you understand the context and automatically add the correct terms. Include headings, subheadings, and proper formatting. Make sure to include all the details and information from the transcript:\n\n${transcript}.`;

      const result = await model.generateContent(prompt);
      const generatedArticle = result.response.text();
      setArticle(generatedArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!article) return;

    const blob = new Blob([article], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "article.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <BlurryBackground />
      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            YouTube to Article Generator
          </h1>
          <p className="text-xl text-muted-foreground">
            Transform YouTube videos into beautifully formatted articles
          </p>
        </div>

        <Card className="backdrop-blur-xl bg-background/60 border-border/40 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Generate Your Article
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your YouTube URL and let AI create an article
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="api-key" className="text-muted-foreground">
                    Gemini API Key (Optional)
                  </Label>
                  {!isUsingDefaultKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => {
                        localStorage.removeItem("geminiApiKey");
                        setApiKey("");
                        setIsUsingDefaultKey(true);
                      }}>
                      Use Default Key
                    </Button>
                  )}
                </div>
                <Input
                  id="api-key"
                  type="password"
                  className="bg-background/50 border-border/40 focus:ring-primary/20"
                  placeholder={
                    isUsingDefaultKey ? "Using default API key" : "Enter your Gemini API key"
                  }
                  value={isUsingDefaultKey ? "" : apiKey}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    setApiKey(newKey);
                    if (newKey) {
                      localStorage.setItem("geminiApiKey", newKey);
                      setIsUsingDefaultKey(false);
                    }
                  }}
                  required={!isUsingDefaultKey}
                />
                {isUsingDefaultKey && (
                  <p className="text-sm text-muted-foreground">
                    Using default API key. Enter a custom key to use your own.{" "}
                    <a
                      className="text-primary hover:text-primary/80 transition-colors"
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer">
                      Get your API key
                    </a>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube-url" className="text-muted-foreground">
                  YouTube URL
                </Label>
                <Input
                  id="youtube-url"
                  type="url"
                  className="bg-background/50 border-border/40 focus:ring-primary/20"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </div>
                ) : (
                  "Generate Article"
                )}
              </Button>
            </form>

            {error && (
              <Alert
                variant="destructive"
                className="bg-destructive/20 backdrop-blur-sm border-destructive/40">
                <AlertCircleIcon className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive">Error</AlertTitle>
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            {article && (
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Generated Article
                  </h3>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="border-border/40 hover:bg-primary/10 transition-colors">
                    Download Markdown
                  </Button>
                </div>
                <div className="prose max-w-none dark:prose-invert p-6 rounded-lg bg-background/50 backdrop-blur-sm border border-border/40 shadow-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{article}</ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
