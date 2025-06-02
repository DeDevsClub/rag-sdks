export function PromptSuggestionRow({
  onPromptClick,
}: {
  onPromptClick: (prompt: string) => void;
}) {
  const prompts = [
    "What are the documents in the database about?",
    "Summarize the key points of the documents in the database",
    "What are the key takeaways from the documents in the database?",
  ];
  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton
          key={`suggestion-${index}`}
          prompt={prompt}
          onClick={(prompt) => onPromptClick(prompt)}
        />
      ))}
    </div>
  );
}

export function PromptSuggestionButton({
  prompt,
  onClick,
}: {
  prompt: string;
  onClick: (prompt: string) => void;
}) {
  return (
    <button
      className="prompt-suggestion-button"
      onClick={() => onClick(prompt)}
    >
      {prompt}
    </button>
  );
}
