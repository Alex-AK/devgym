import { useEffect, useState } from 'react';

import { type Product, searchProducts } from './api';

export interface AutocompleteProps {
  label: string;
  /** How long to wait after the last keystroke before searching. */
  debounceMs?: number;
  onSelect?: (product: Product) => void;
}

/**
 * Search-as-you-type over the product catalogue.
 *
 * It works, as long as you use a mouse, type slowly and can see the screen.
 *
 * TODO: debounce the typing, cancel the search that is no longer wanted, drive
 * the list from the keyboard, and give it the roles a combobox is supposed to
 * have. See brief.md.
 */
export function Autocomplete({ label, onSelect }: AutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Fires on every keystroke, and whichever answer turns up last wins.
    void searchProducts(query).then((products) => {
      setResults(products);
      setOpen(true);
    });
  }, [query]);

  const select = (product: Product) => {
    setQuery(product.name);
    setOpen(false);
    onSelect?.(product);
  };

  return (
    <div className="autocomplete">
      <label htmlFor="product-search">{label}</label>
      <input
        id="product-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {open && (
        <ul className="autocomplete-list">
          {results.map((product) => (
            <li key={product.id}>
              <button type="button" onClick={() => select(product)}>
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
