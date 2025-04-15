"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircleIcon,
  CopyIcon,
  DownloadCloudIcon,
  Loader2Icon,
  RefreshCcwIcon,
  Settings2Icon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { BlurryBackground } from "./blurry-background";
import { toast } from "sonner";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

interface StoredArticle {
  url: string;
  article: string;
  timestamp: number;
}

export function YouTubeForm() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");
  const [isUsingDefaultKey, setIsUsingDefaultKey] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasStoredArticle, setHasStoredArticle] = useState(false);
  const defaultKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const defaultPrompt = `Convert the following lecture transcript into a well-structured article in markdown format. The transcript is a lecture on a specific topic and might have some technical terms and jargon that are not transcribed correctly, so make sure you understand the context and automatically add the correct terms. DO NOT MISS ANY DETAIL. INCLUDE EVERYTHING THAT IS IN THE TRANSCRIPT. DO NOT OUTPUT ANYTHING ELSE THAN THE ARTICLE. Include headings, subheadings, and proper formatting. Make sure to include all the details and information from the transcript:\n\n{transcript}.`;

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

    // Load article from localStorage if URL matches
    const storedArticles = JSON.parse(
      localStorage.getItem("generatedArticles") || "[]"
    ) as StoredArticle[];
    const matchingArticle = storedArticles.find((a) => a.url === url);
    if (matchingArticle) {
      setArticle(matchingArticle.article);
      setHasStoredArticle(true);
    } else {
      setHasStoredArticle(false);
    }
  }, [url]);

  const storeArticle = (url: string, article: string) => {
    const storedArticles = JSON.parse(
      localStorage.getItem("generatedArticles") || "[]"
    ) as StoredArticle[];
    const newArticle = {
      url,
      article,
      timestamp: Date.now(),
    };

    // Remove any existing article for this URL
    const filteredArticles = storedArticles.filter((a) => a.url !== url);
    // Add new article
    localStorage.setItem("generatedArticles", JSON.stringify([...filteredArticles, newArticle]));
  };

  const fetchSubtitlesWithProxy = async (videoId: string) => {
    try {
      // Using cors-anywhere proxy service
      const proxyUrl = "https://cors-proxy.fringe.zone/";
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(`${proxyUrl}${targetUrl}`);

      if (!response.ok) {
        throw new Error("Failed to fetch video data");
      }

      const html = await response.text();
      const captionsUrl = html.match(/"captionTracks":\[(.*?)\]/)?.[1];
      console.log("🚀 => YouTubeForm => captionsUrl:", captionsUrl);

      if (!captionsUrl) {
        throw new Error("No subtitles found for this video");
      }

      // Check if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Parse the caption data
      let captionData;
      try {
        captionData = JSON.parse(`[${captionsUrl}]`)[0];
      } catch (error) {
        // If parsing fails and we're on mobile, try fixing the JSON
        if (isMobile) {
          const fixedCaptionsUrl = captionsUrl + "]}}";
          console.log("🚀 => YouTubeForm => fixedCaptionsUrl:", fixedCaptionsUrl);
          captionData = JSON.parse(`[${fixedCaptionsUrl}]`)[0];
        } else {
          throw error;
        }
      }

      // Ensure we have a complete URL
      let baseUrl = captionData.baseUrl;
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://www.youtube.com${baseUrl}`;
      }

      const captionResponse = await fetch(`${proxyUrl}${baseUrl}`);
      if (!captionResponse.ok) {
        throw new Error("Failed to fetch subtitles");
      }

      const captionXml = await captionResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(captionXml, "text/xml");
      const textElements = xmlDoc.getElementsByTagName("text");

      return Array.from(textElements).map((element) => ({
        text: element.textContent || "",
        start: parseFloat(element.getAttribute("start") || "0"),
        dur: parseFloat(element.getAttribute("dur") || "0"),
      }));
    } catch (error) {
      console.error("Error fetching subtitles:", error);
      throw error;
    }
  };

  const generateArticle = async (url: string, keyToUse: string) => {
    // Extract video ID from URL - support all YouTube URL formats
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    )?.[1];

    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid YouTube URL.");
    }

    // Get subtitles using the proxy
    const subtitles = await fetchSubtitlesWithProxy(videoId);
    if (!subtitles || subtitles.length === 0) {
      throw new Error(
        "No subtitles found for this video. Please ensure the video has captions enabled."
      );
    }
    const transcript = subtitles.map((item: { text: string }) => item.text).join(" ");

    console.log("🚀 => generateArticle => transcript:", transcript);
    // Generate article using Gemini
    const genAI = new GoogleGenerativeAI(keyToUse.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = showAdvanced
      ? customPrompt.replace("{transcript}", transcript)
      : defaultPrompt.replace("{transcript}", transcript);

    const result = await model.generateContent(prompt);
    return result.response.text();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // If we have a stored article and we're not regenerating, just return
      if (hasStoredArticle && !isRegenerating) {
        setIsLoading(false);
        toast.info(
          "Article was already generated earlier. Please use the regenerate button to generate a new article."
        );
        return;
      }

      const keyToUse = isUsingDefaultKey ? defaultKey : apiKey;
      if (!keyToUse) {
        throw new Error("Please enter your Gemini API key");
      }

      const generatedArticle = await generateArticle(url, keyToUse);
      setArticle(generatedArticle);
      storeArticle(url, generatedArticle);
      setHasStoredArticle(true);
      setIsRegenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRegenerating(true);
    handleSubmit(e as unknown as React.FormEvent);
  };

  const handleDownload = () => {
    if (!article) return;

    const blob = new Blob([article], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "article.txt`";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(article);
    toast.success("Article copied to clipboard");
  };

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <BlurryBackground />
      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            YouTube to Article Generator
          </h2>
          <p className="text-xl text-muted-foreground">
            Transform YouTube videos into beautifully formatted articles
          </p>
        </div>

        <Card className="backdrop-blur-xl bg-background/60 border-border/40 shadow-2xl">
          <CardHeader className="space-y-1">
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Generate Your Article
            </h3>
            <CardDescription className="text-muted-foreground">
              Enter your YouTube URL and let AI create an article
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  aria-label="YouTube URL"
                />
              </div>

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
                  aria-label="Gemini API Key"
                />
                {isUsingDefaultKey && (
                  <p className="text-sm text-muted-foreground">
                    Enter your own API key if you face errors or rate limits.{" "}
                    <a
                      className="text-primary hover:text-primary/80 transition-colors"
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer">
                      Get your API key here
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="advanced-toggle"
                    className="text-muted-foreground flex items-center gap-2">
                    <Settings2Icon className="w-4 h-4" />
                    Advanced Settings
                  </Label>
                  <Switch
                    id="advanced-toggle"
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                    aria-label="Toggle advanced settings"
                  />
                </div>
                {showAdvanced && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt" className="text-muted-foreground">
                      Custom Prompt
                    </Label>
                    <Textarea
                      id="custom-prompt"
                      className="bg-background/50 border-border/40 focus:ring-primary/20 min-h-[100px]"
                      placeholder={defaultPrompt}
                      value={customPrompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCustomPrompt(e.target.value)
                      }
                      aria-label="Custom prompt"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use {"{transcript}"} to insert the video transcript in your prompt
                    </p>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                onClick={hasStoredArticle ? handleRegenerate : undefined}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    {hasStoredArticle ? "Regenerating..." : "Generating..."}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    {hasStoredArticle ? (
                      <>
                        <RefreshCcwIcon className="w-4 h-4 mr-2" />
                        Regenerate Article
                      </>
                    ) : (
                      "Generate Article"
                    )}
                  </div>
                )}
              </Button>
            </form>

            {error && (
              <Alert
                variant="destructive"
                className="bg-destructive/20 backdrop-blur-sm border-destructive/40"
                role="alert">
                <AlertCircleIcon className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive">Error</AlertTitle>
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            {article && (
              <section className="mt-8 space-y-4">
                <div className="flex items-start gap-2 flex-col">
                  <h4 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Generated Article
                  </h4>
                  <div className="flex items-center gap-2 overflow-auto w-full p-3">
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="border-border/40 hover:bg-primary/10 transition-colors"
                      aria-label="Download article as Markdown">
                      <DownloadCloudIcon className="w-4 h-4" />
                      Download Markdown
                    </Button>
                    <Button
                      onClick={handleCopy}
                      variant="outline"
                      className="border-border/40 hover:bg-primary/10 transition-colors"
                      aria-label="Copy article to clipboard">
                      <CopyIcon className="w-4 h-4" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
                <article className="prose max-w-none dark:prose-invert p-6 rounded-lg bg-background/50 backdrop-blur-sm border border-border/40 shadow-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{article}</ReactMarkdown>
                </article>
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
