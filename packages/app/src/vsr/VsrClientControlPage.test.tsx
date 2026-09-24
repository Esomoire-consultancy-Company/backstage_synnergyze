import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { VsrClientControlPage } from './VsrClientControlPage';

describe('VsrClientControlPage', () => {
  it('renders Genesis, Synnergyze and Warden control surfaces', async () => {
    await renderInTestApp(<VsrClientControlPage />);

    expect(screen.getByText('VSR Client Control')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Genesis' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Synnergyze' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Warden Live' }),
    ).toBeInTheDocument();
  });
});
