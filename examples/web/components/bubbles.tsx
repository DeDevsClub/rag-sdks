import { Message } from "@ai-sdk/react";

export function Bubble({ message }: { message: Message }) {
    const { content, role } = message;
    const className = role === "user" ? "bubble user" : "bubble assistant";
    
  return <div className={className}>{content}</div>;
}

export function LoadingBubble() {
  return <div className="loader"></div>;
}
