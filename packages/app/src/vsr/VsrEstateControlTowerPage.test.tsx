import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { VsrEstateControlTowerPage } from './VsrEstateControlTowerPage';

describe('VsrEstateControlTowerPage', () => {
  it('renders the estate health and troubleshooting entry surfaces', async () => {
    await renderInTestApp(<VsrEstateControlTowerPage />);

    expect(screen.getByText('VSR Estate Control Tower')).toBeInTheDocument();
    expect(screen.getByText('ALPHA-NODE-001')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Genesis / Catalog' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'DevTools' }),
    ).toBeInTheDocument();
  });
});
