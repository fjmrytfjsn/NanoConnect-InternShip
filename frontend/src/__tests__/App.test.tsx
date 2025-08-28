import { render } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  test('レンダリングできることを確認', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});