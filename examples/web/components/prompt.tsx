export function PromptSuggestionRow({ onPromptClick }: { onPromptClick: (prompt: string) => void }) {
    const prompts = [
        "What is Morpho?",
        "What is the history of Morpho?",
        "What is the future of Morpho?",
    ]
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

export function PromptSuggestionButton({ prompt, onClick }: { prompt: string; onClick: (prompt: string) => void }) {
    return (
        <button className="prompt-suggestion-button" onClick={() => onClick(prompt)}>
            {prompt}
        </button>
    )
}