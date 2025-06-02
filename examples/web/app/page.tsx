'use client'

import Image from "next/image";
import { Message, useChat } from '@ai-sdk/react'
import PromptSuggestionRow from "@/components/suggestions-row";
import LoadingBubble from "@/components/loading-bubble";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  })

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark object-cover w-full h-[600px]"
          src="/hero.svg"
          alt="Next.js logo"
          width={3200}
          height={2400}
          priority
        />

        {messages.length === 0 && (
          <div>
            {/* <p className="text-md font-bold text-center bg-gray-200 p-4 rounded-lg border text-gray-600 w-full mx-auto justify-center">Ask a question</p> */}
            <PromptSuggestionRow />
          </div>
        )}

        <div className="flex flex-col gap-4">
          <LoadingBubble />
          {/* {messages.map((message) => (
            <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            >
              {message.content}
            </div>
          ))} */}

          {/* <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              className="flex-1 p-2 border rounded-lg"
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded-lg"
            >
              Ask
            </button>
          </form> */}
        </div>
      </main>
    </div>
  );
}
