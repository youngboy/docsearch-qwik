import type { AutocompleteApi } from '@algolia/autocomplete-core';
import { getNextActiveItemId } from '@algolia/autocomplete-core/dist/esm/utils';
import { getItemsCount } from '@algolia/autocomplete-shared';
import { component$, Ref, useContext } from '@builder.io/qwik';

import { MAX_QUERY_SIZE } from './constants';
import { SearchContext } from './context';
import { LoadingIcon } from './icons/LoadingIcon';
import { ResetIcon } from './icons/ResetIcon';
import { SearchIcon } from './icons/SearchIcon';
import type { DocSearchHit, InternalDocSearchHit } from './types';
import { getActiveItem } from './utils/getActiveItem';

export type SearchBoxTranslations = Partial<{
  resetButtonTitle: string;
  resetButtonAriaLabel: string;
  cancelButtonText: string;
  cancelButtonAriaLabel: string;
}>;

interface SearchBoxProps {
  state: any;
  autoFocus: boolean;
  inputRef: Ref<HTMLInputElement | null>;
  onClose$: () => void;
  isFromSelection: boolean;
  translations?: SearchBoxTranslations;
  appId: string;
  apiKey: string;
  indexName: string;
  transformItems$: (data: DocSearchHit[]) => DocSearchHit[];
}

export const SearchBox = component$(({ translations = {}, ...props }: SearchBoxProps) => {
  const {
    resetButtonTitle = 'Clear the query',
    resetButtonAriaLabel = 'Clear the query',
    cancelButtonText = 'Cancel',
    cancelButtonAriaLabel = 'Cancel',
  } = translations;

  // TODO: get it working
  // useClientEffect$(({ track }) => {
  //   props.inputRef.current?.focus();
  // });
  const context: any = useContext(SearchContext);
  return (
    <>
      <form
        class="DocSearch-Form"
        noValidate={true}
        role="search"
        action=""
        preventdefault:submit
        onReset$={(e: any) => {
          props.state.query = '';
          props.state.status = 'idle';
          props.state.activeItemId = null;
        }}
      >
        <label class="DocSearch-MagnifierLabel" htmlFor="docsearch-input" id="docsearch-label">
          <SearchIcon />
        </label>

        <div class="DocSearch-LoadingIndicator">
          <LoadingIcon />
        </div>

        <input
          class="DocSearch-Input"
          aria-autocomplete="both"
          aria-activedescendant={undefined ? '' : 'docsearch-item-ITEM_ID'}
          aria-control="docsearch-list"
          aria-labelledby="docsearch-label"
          value={props.state.query}
          id="docsearch-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          maxLength={MAX_QUERY_SIZE}
          enterKeyHint={props.state.activeItemId ? 'go' : 'search'}
          spellCheck="false"
          autoFocus={props.autoFocus}
          placeholder="Search docs"
          type="search"
          ref={props.inputRef as any}
          onInput$={(event: Event) => {
            context.onInput?.(event);
          }}
          onChange$={(event: Event) => {
            context.onInput?.(event);
          }}
          // TODO: preventdefault:keydown by key's condition
          onKeyDown$={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const nextActiveId = getNextActiveItemId(
                event.key === 'ArrowUp' ? -1 : 1,
                props.state.activeItemId,
                getItemsCount(props.state),
                null
              );
              if (nextActiveId !== props.state.activeItemId) {
                props.state.activeItemId = nextActiveId;
                // scroll to if necessary
                if (typeof document !== 'undefined') {
                  const nodeItem = document.getElementById(
                    `docsearch-item-${props.state.activeItemId}`
                  );
                  if (nodeItem) {
                    if ((nodeItem as any).scrollIntoViewIfNeeded) {
                      (nodeItem as any).scrollIntoViewIfNeeded(false);
                    } else {
                      nodeItem.scrollIntoView(false);
                    }
                  }
                }
              }
            }
            if (event.key === 'Escape') {
              props.state.isOpen = false;
              // TODO: cancel pending request
            }
            if (event.key === 'Enter') {
              const { item, itemUrl } = getActiveItem({
                ...props.state,
              })!;
              if (event.metaKey || event.ctrlKey) {
                if (itemUrl !== undefined) {
                  context.onSelectItem({ item, event });
                  const windowReference = window.open(itemUrl, '_blank', 'noopener');
                  windowReference?.focus();
                }
              } else if (event.shiftKey) {
                if (itemUrl !== undefined) {
                  context.onSelectItem({ item, event });
                  window.open(itemUrl, '_blank', 'noopener');
                }
              } else if (event.altKey) {
                // Keep native browser behavior
              } else {
                if (itemUrl !== undefined) {
                  context.onSelectItem({ item, event });
                  location.assign(itemUrl);
                }
              }
            }
          }}
          onFocus$={(e) => {
            // noop
          }}
          onClick$={(e) => {
            // noop
          }}
        />

        <button
          type="reset"
          title={resetButtonTitle}
          class="DocSearch-Reset"
          aria-label={resetButtonAriaLabel}
          hidden={!props.state.query}
        >
          <ResetIcon />
        </button>
      </form>

      <button
        class="DocSearch-Cancel"
        type="reset"
        aria-label={cancelButtonAriaLabel}
        onClick$={() => props.onClose$.apply(null, [])}
      >
        {cancelButtonText}
      </button>
    </>
  );
});
