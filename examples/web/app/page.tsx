"use client";

import Image from "next/image";
import { Message, useChat } from "@ai-sdk/react";
import { PromptSuggestionRow } from "@/components/prompt";
import { Bubble, LoadingBubble } from "@/components/bubbles";

export default function Home() {
  const { append, status, messages, input, handleInputChange, handleSubmit } =
    useChat();
  const noMessages = !messages || messages.length === 0;

  const handlePrompt = (promptText: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    append(msg);
    // handleSubmit();
  };

  return (
    <main
    // className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start"
    >
      <div className="flex flex-cols text-xl font-bold items-center justify-center bg-[#383838] text-white p-2 border rounded w-full text-center gap-[32px]">
        <Image
          src="/logo.png"
          alt="Next.js logo"
          width={36}
          height={36}
          priority
        />
        Custom RAG Chat Workspace
      </div>
      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <p className="starter-text">
            Welcome to your custom RAG Chat space, where you are able to query
            your custom data.
            <br />
            <PromptSuggestionRow onPromptClick={handlePrompt} />
          </p>
        ) : (
          <div>
            {status === "streaming" && <LoadingBubble />}
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask a question..."
          className={"question-box"}
        />
        <input type="submit" />
      </form>
    </main>
  );
}
