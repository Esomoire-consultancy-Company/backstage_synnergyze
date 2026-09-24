/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
