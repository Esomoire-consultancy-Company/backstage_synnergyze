import { render, waitFor } from '@testing-library/react';

describe('App', () => {
  it('should render', async () => {
    process.env = {
      NODE_ENV: 'test',
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
          },
          context: 'test',
        },
      ] as any,
    };

    // Load the application after the test configuration has been initialized.
    const { default: App } = await import('./App');
    const rendered = render(<App />);

    await waitFor(() => {
      expect(rendered.baseElement).toBeInTheDocument();
    });
  });
});
