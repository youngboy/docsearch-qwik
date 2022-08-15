import type { AutocompleteApi, AutocompleteState, BaseItem } from '@algolia/autocomplete-core';
import { component$, Ref } from '@builder.io/qwik';

import type { DocSearchProps } from './doc-search';
import type { ErrorScreenTranslations } from './error-screen';
import { ErrorScreen } from './error-screen';
import type { NoResultsScreenTranslations } from './no-results-screen';
import { NoResultsScreen } from './no-results-screen';
import { ResultsScreen } from './results-screen';
import type { StartScreenTranslations } from './start-screen';
import { StartScreen } from './start-screen';
import type { InternalDocSearchHit, StoredDocSearchHit } from './types';

export type ScreenStateTranslations = Partial<{
  errorScreen: ErrorScreenTranslations;
  startScreen: StartScreenTranslations;
  noResultsScreen: NoResultsScreenTranslations;
}>;

export interface ScreenStateProps<TItem extends BaseItem> {
  state: AutocompleteState<TItem>;
  inputRef: Ref<HTMLInputElement | null>;
  indexName: DocSearchProps['indexName'];
  disableUserPersonalization: boolean;
  resultsFooterComponent: DocSearchProps['resultsFooterComponent'];
  translations: ScreenStateTranslations;
  getMissingResultsUrl?: DocSearchProps['getMissingResultsUrl'];
}

export const ScreenState = component$(
  ({ translations = {}, ...props }: ScreenStateProps<InternalDocSearchHit>) => {
    if (props.state.status === 'error') {
      return <ErrorScreen translations={translations?.errorScreen} />;
    }

    const hasCollections = props.state.collections.some(
      (collection) => collection.items.length > 0
    );

    if (!props.state.query) {
      return (
        <StartScreen
          disableUserPersonalization={props.disableUserPersonalization}
          state={props.state}
          translations={translations?.startScreen}
        />
      );
    }

    if (hasCollections === false) {
      return <NoResultsScreen state={props.state} translations={translations?.noResultsScreen} />;
    }

    return <ResultsScreen state={props.state} />;
  }
);

// TODO: xx
// function areEqual(_prevProps, nextProps) {
//   // We don't update the screen when Autocomplete is loading or stalled to
//   // avoid UI flashes:
//   //  - Empty screen → Results screen
//   //  - NoResults screen → NoResults screen with another query
//   return nextProps.state.status === 'loading' || nextProps.state.status === 'stalled';
// }
