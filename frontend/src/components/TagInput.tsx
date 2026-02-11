import React, { useState, useRef, useMemo } from 'react';
import { X } from 'lucide-react';

interface Props {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[]; // List of existing tags for autocomplete
}

export const TagInput: React.FC<Props> = ({ selectedTags, onChange, availableTags }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive suggestions based on input
  const suggestions = useMemo(() => {
    if (inputValue.trim() === '') return [];
    const lowerInput = inputValue.toLowerCase();
    return availableTags.filter(
      tag => tag.toLowerCase().includes(lowerInput) && !selectedTags.includes(tag)
    );
  }, [inputValue, availableTags, selectedTags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    else if (e.key === 'Tab') {
      if (showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        addTag(suggestions[0]);
      }
    }
    else if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-2 rounded border border-gray-600 bg-background p-2 focus-within:border-primary transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-bold text-white animate-in zoom-in duration-100">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="rounded-full hover:bg-white hover:text-primary transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="min-w-[120px] flex-1 bg-transparent text-text focus:outline-none"
          placeholder={selectedTags.length === 0 ? "Type tag and press comma..." : ""}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => inputValue && setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-600 bg-surface shadow-lg">
          {suggestions.map(suggestion => (
            <li
              key={suggestion}
              className="cursor-pointer px-4 py-2 hover:bg-primary hover:text-white"
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};