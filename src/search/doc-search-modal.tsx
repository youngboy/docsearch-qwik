import {
  component$,
  useStore,
  useRef,
  mutable,
  noSerialize,
  useContextProvider,
} from '@builder.io/qwik';
import { MAX_QUERY_SIZE } from './constants';
import { SearchContext } from './context';
import type { DocSearchProps } from './doc-search';
import type { FooterTranslations } from './footer';
import { Footer } from './footer';
import { handleSearch } from './handleSearch';
import type { ScreenStateTranslations } from './screen-state';
import { ScreenState } from './screen-state';
import type { SearchBoxTranslations } from './search-box';
import { SearchBox } from './search-box';
import type { DocSearchHit, InternalDocSearchHit } from './types';

import { identity, noop } from './utils';
import { clearStalled, setStalled } from './utils/stalledControl';

export type ModalTranslations = Partial<{
  searchBox: SearchBoxTranslations;
  footer: FooterTranslations;
}> &
  ScreenStateTranslations;

export type DocSearchModalProps = DocSearchProps & {
  onClose$: () => void;
  translations?: ModalTranslations;
};

export const DocSearchModal = component$(
  ({
    appId,
    apiKey,
    indexName,
    state,
    onClose$ = noop,
    transformItems$ = identity,
    resultsFooterComponent = () => null,
    disableUserPersonalization = false,
    translations = {},
    getMissingResultsUrl,
  }: DocSearchModalProps) => {
    const {
      footer: footerTranslations,
      searchBox: searchBoxTranslations,
      ...screenStateTranslations
    } = translations;
    const initialQueryFromSelection =
      typeof window !== 'undefined'
        ? window.getSelection()!.toString().slice(0, MAX_QUERY_SIZE)
        : '';
    const refState = useStore({
      snippetLength: 10,
      initialQueryFromSelection,
      initialQuery: initialQueryFromSelection,
    });

    const containerRef = useRef();
    const modalRef = useRef();
    const formElementRef = useRef();
    const dropdownRef = useRef();
    const inputRef = useRef();
    function saveRecentSearch(item: InternalDocSearchHit) {
      if (disableUserPersonalization) {
        return;
      }

      // We don't store `content` record, but their parent if available.
      const search = item.type === 'content' ? item.__docsearch_parent : item;

      // We save the recent search only if it's not favorited.
      if (
        search &&
        state.favoriteSearches?.getAll().findIndex((x: any) => x.objectID === search.objectID) ===
          -1
      ) {
        state.recentSearches?.add(search);
      }
    }

    const onSelectItem = noSerialize(({ item, event }: any) => {
      saveRecentSearch(item);
      if (event) {
        if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
          onClose$.apply(undefined, []);
        }
      }
    }) as any;

    const onInput = noSerialize((event: Event) => {
      // TODO: cancelable request
      clearStalled();
      const query = (event.target as HTMLInputElement).value.slice(0, MAX_QUERY_SIZE);
      state.query = query;
      state.completion = null;
      state.activeItemId = null;
      state.status = 'loading';
      // set new stalledId
      setStalled(() => {
        state.status = 'stalled';
      });
      handleSearch(query, {
        state: state,
        appId: appId,
        apiKey: apiKey,
        indexName: indexName,
        snippetLength: 10,
        transformItems: (data: DocSearchHit[]) => {
          return transformItems$.apply(undefined, [data]);
        },
      })
        .then(({ collections }) => {
          state.status = 'idle';
          state.collections = collections.map((c) => ({
            ...c,
            source: {
              items: c.items,
              sourceId: c.sourceId,
            },
          }));
          // TODO:
          // if not opened, ensure open
          // if actived before, set active
        })
        .finally(() => {
          clearStalled();
          state.status = 'idle';
        });
    });
    useContextProvider(SearchContext, {
      onSelectItem,
      onInput,
    });

    // useTouchEvents({
    //   getEnvironmentProps,
    //   panelElement: dropdownRef.current as any,
    //   formElement: formElementRef.current as any,
    //   inputElement: inputRef.current as any,
    // });

    // useTrapFocus(containerRef as any);

    // useClientEffect$(({ track }) => {
    //   document.body.classList.add('DocSearch--active');

    //   const isMobileMediaQuery = window.matchMedia('(max-width: 768px)');

    //   if (isMobileMediaQuery.matches) {
    //     refState.snippetLength = 5;
    //   }

    //   return () => {
    //     document.body.classList.remove('DocSearch--active');

    //     // IE11 doesn't support `scrollTo` so we check that the method exists
    //     // first.
    //     window.scrollTo?.(0, initialScrollY);
    //   };
    // });

    // useClientEffect$(({ track }) => {
    //   track(state, 'query');
    //   if (dropdownRef.current) {
    //     dropdownRef.current.scrollTop = 0;
    //   }
    // });

    // We don't focus the input when there's an initial query (i.e. Selection
    // Search) because users rather want to see the results directly, without the
    // keyboard appearing.
    // We therefore need to refresh the autocomplete instance to load all the
    // results, which is usually triggered on focus.
    // useClientEffect$(({ track }) => {
    //   const initialQuery = track(refState, 'initialQuery');
    //   if (initialQuery.length > 0) {
    //     refresh();

    //     if (inputRef.current) {
    //       // @ts-ignore
    //       inputRef.current.focus();
    //     }
    //   }
    // });

    // We rely on a CSS property to set the modal height to the full viewport height
    // because all mobile browsers don't compute their height the same way.
    // See https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
    // useClientEffect$(() => {
    //   function setFullViewportHeight() {
    //     if (modalRef.current) {
    //       const vh = window.innerHeight * 0.01;
    //       // @ts-ignore
    //       modalRef.current.style.setProperty('--docsearch-vh', `${vh}px`);
    //     }
    //   }

    //   setFullViewportHeight();

    //   window.addEventListener('resize', setFullViewportHeight);

    //   return () => {
    //     window.removeEventListener('resize', setFullViewportHeight);
    //   };
    // });

    return (
      <div
        ref={containerRef}
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-owns="docsearch-list"
        aria-labelledby="docsearch-list"
        class={[
          'DocSearch',
          'DocSearch-Container',
          state.status === 'stalled' && 'DocSearch-Container--Stalled',
          state.status === 'error' && 'DocSearch-Container--Errored',
        ]
          .filter(Boolean)
          .join(' ')}
        role="button"
        tabIndex={0}
        onMouseDown$={(event) => {
          if (event.target === containerRef.current) {
            onClose$.apply(undefined, []);
          }
        }}
      >
        <div class="DocSearch-Modal" ref={modalRef}>
          <header class="DocSearch-SearchBar" ref={formElementRef}>
            <SearchBox
              appId={appId}
              apiKey={apiKey}
              indexName={indexName}
              state={state}
              autoFocus={refState.initialQuery.length === 0}
              inputRef={inputRef as any}
              transformItems$={transformItems$}
              isFromSelection={
                Boolean(refState.initialQuery) &&
                refState.initialQuery === refState.initialQueryFromSelection
              }
              translations={searchBoxTranslations}
              onClose$={() => {
                onClose$.apply(undefined, []);
              }}
            />
          </header>

          <div class="DocSearch-Dropdown" ref={dropdownRef}>
            <ScreenState
              indexName={indexName}
              state={state}
              resultsFooterComponent={mutable(resultsFooterComponent)}
              disableUserPersonalization={disableUserPersonalization}
              inputRef={inputRef as any}
              translations={mutable(screenStateTranslations)}
              getMissingResultsUrl={getMissingResultsUrl}
            />
          </div>

          <footer class="DocSearch-Footer">
            <Footer translations={footerTranslations} />
          </footer>
        </div>
      </div>
    );
  }
);
