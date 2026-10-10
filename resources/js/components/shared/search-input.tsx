import { Input, type InputProps } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import * as React from 'react';

interface SearchInputProps extends Omit<InputProps, 'type' | 'leadingIcon' | 'trailingIcon'> {
    /** Shows a spinner on the trailing edge while a (debounced/async) search is running. */
    loading?: boolean;
}

/** Search field in the shared form-control style: leading magnifier, clear (×) when `onClear` is given. */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({ loading = false, placeholder = 'Search...', ...props }, ref) => (
    <Input
        ref={ref}
        type="search"
        role="searchbox"
        autoComplete="off"
        placeholder={placeholder}
        leadingIcon={<Search />}
        trailingIcon={loading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-label="Searching" /> : undefined}
        {...props}
    />
));
SearchInput.displayName = 'SearchInput';

export { SearchInput };
