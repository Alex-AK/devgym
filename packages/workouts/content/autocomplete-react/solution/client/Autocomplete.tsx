import { type KeyboardEvent, useEffect, useId, useState } from 'react';

import { type Product, searchProducts } from './api';

export interface AutocompleteProps {
  label: string;
  /** How long to wait after the last keystroke before searching. */
  debounceMs?: number;
  onSelect?: (product: Product) => void;
}

export function Autocomplete({ label, debounceMs = 300, onSelect }: AutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);

  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setOpen(false);
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    // Nothing is sent until the typing stops. The cleanup below cancels the
    // timer, so a keystroke inside the window replaces the pending search
    // rather than queueing another one.
    const timer = setTimeout(() => {
      searchProducts(term, { signal: controller.signal })
        .then((products) => {
          setResults(products);
          setOpen(true);
          setActive(-1);
          setFailed(false);
        })
        .catch((error: unknown) => {
          // Abandoning a search on purpose is not a failure, and showing the
          // user an error for it is worse than showing nothing.
          if ((error as { name?: string }).name !== 'AbortError') setFailed(true);
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      // The answer to the old query can no longer be the answer on screen, so
      // stop it coming back at all rather than filtering it out on arrival.
      controller.abort();
    };
  }, [query, debounceMs]);

  const select = (product: Product) => {
    setQuery(product.name);
    setOpen(false);
    setActive(-1);
    onSelect?.(product);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      const chosen = results[active];
      if (chosen) {
        event.preventDefault();
        select(chosen);
      }
    }
  };

  return (
    <div className="autocomplete">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        // Which option the keyboard is on. The input keeps focus throughout,
        // so this is how a screen reader is told what is highlighted.
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />

      {failed && <p role="alert">Something went wrong. Try again.</p>}

      {open && (
        <ul id={listboxId} role="listbox" aria-label={label} className="autocomplete-list">
          {results.map((product, index) => (
            <li
              key={product.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => select(product)}
            >
              {product.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
