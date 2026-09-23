import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { VsrClientAccountPage } from './VsrClientAccountPage';

describe('VsrClientAccountPage', () => {
  it('renders the client admin control tabs', async () => {
    await renderInTestApp(<VsrClientAccountPage />);

    expect(screen.getByText('Virtual Silk Road')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Genesis' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Synnergyze' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Warden' })).toBeInTheDocument();
  });
});
