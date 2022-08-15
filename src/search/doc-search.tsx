import type { AutocompleteState, AutocompleteOptions } from '@algolia/autocomplete-core';
import type { SearchOptions } from '@algolia/client-search';
import type { SearchClient } from 'algoliasearch/lite';
import { component$, useStore, useStyles$, useRef, useClientEffect$ } from '@builder.io/qwik';
import type { DocSearchHit, InternalDocSearchHit, StoredDocSearchHit } from './types';
import { ButtonTranslations, DocSearchButton } from './doc-search-button';
import { DocSearchModal, ModalTranslations } from './doc-search-modal';
import styles from './doc-search.css?inline';
import { createStoredSearches } from './stored-searches';

export type DocSearchTranslations = Partial<{
  button: ButtonTranslations;
  modal: ModalTranslations;
}>;

export interface DocSearchProps {
  state: any;
  appId: string;
  apiKey: string;
  indexName: string;
  placeholder?: string;
  searchParameters?: SearchOptions;
  transformItems$?: (items: DocSearchHit[]) => DocSearchHit[];
  resultsFooterComponent?: (props: {
    state: AutocompleteState<InternalDocSearchHit>;
  }) => any;
  transformSearchClient?: (searchClient: SearchClient) => SearchClient;
  disableUserPersonalization?: boolean;
  initialQuery?: string;
  navigator?: AutocompleteOptions<InternalDocSearchHit>['navigator'];
  translations?: DocSearchTranslations;
  getMissingResultsUrl?: (op: { query: string }) => string;
}
export function isEditingContent(event: KeyboardEvent): boolean {
  const element = event.target as HTMLElement;
  const tagName = element.tagName;

  return (
    element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA'
  );
}

export const DocSearch = component$((props: DocSearchProps) => {
  useStyles$(styles);
  const state = useStore({
    isOpen: false,
    initialQuery: props.initialQuery,
    favoriteSearches: null as any,
    recentSearches: null as any,
    query: '',
    collections: [],
    completion: null,
    context: {
      searchSuggestions: [],
    },
    activeItemId: null,
    status: 'idle',
    refresh: null,
  });
  const searchButtonRef = useRef();
  useClientEffect$(() => {
    state.favoriteSearches = createStoredSearches<StoredDocSearchHit>({
      key: `__DOCSEARCH_FAVORITE_SEARCHES__${props.indexName}`,
      limit: 10,
    });
    state.recentSearches = createStoredSearches<StoredDocSearchHit>({
      key: `__DOCSEARCH_RECENT_SEARCHES__${props.indexName}`,
      // We display 7 recent searches and there's no favorites, but only
      // 4 when there are favorites.
      limit: state.favoriteSearches?.getAll().length === 0 ? 7 : 4,
    });
  });

  return (
    <div
      class="docsearch"
      window:onKeyDown$={(event: KeyboardEvent) => {
        function open() {
          // We check that no other DocSearch modal is showing before opening
          // another one.
          if (!document.body.classList.contains('DocSearch--active')) {
            state.isOpen = true;
          }
        }
        if (
          (event.key === 'Escape' && state.isOpen) ||
          // The `Cmd+K` shortcut both opens and closes the modal.
          (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
          // The `/` shortcut opens but doesn't close the modal because it's
          // a character.
          (!isEditingContent(event) && event.key === '/' && !state.isOpen)
        ) {
          event.preventDefault();

          if (state.isOpen) {
            state.isOpen = false;
          } else if (!document.body.classList.contains('DocSearch--active')) {
            open();
          }
        }

        if (searchButtonRef && searchButtonRef.current === document.activeElement) {
          if (/[a-zA-Z0-9]/.test(String.fromCharCode(event.keyCode))) {
            state.isOpen = true;
            state.initialQuery = event.key;
          }
        }
      }}
    >
      <DocSearchButton
        ref={searchButtonRef}
        onClick$={() => {
          state.isOpen = true;
        }}
      />
      {state.isOpen && (
        <DocSearchModal
          {...props}
          state={state}
          initialQuery={state.initialQuery}
          onClose$={() => {
            state.isOpen = false;
          }}
        />
      )}
    </div>
  );
});
