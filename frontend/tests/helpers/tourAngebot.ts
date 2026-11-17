// Die Willkommenskarte der Tour (0116) liegt beim ersten Laden modal
// über dem Graphen und fängt Tasten ab. Tests, die nicht die Tour prüfen, schließen sie.

import { fireEvent, screen } from '@testing-library/react';

export async function schliesseTourAngebot(): Promise<void> {
  const spaeter = await screen
    .findByRole('button', { name: 'Später' }, { timeout: 1000 })
    .catch(() => null);
  if (spaeter !== null) fireEvent.click(spaeter);
}
