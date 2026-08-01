import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { Dashboard } from '../../src/client/Dashboard';
import { stream } from '../../src/client/event-source';

beforeEach(() => {
  stream.reset();
});

function reading(id: number, host: string, cpu: number) {
  return { id: String(id), data: JSON.stringify({ id, host, cpu }) };
}

/** The rows on screen, as text, whatever markup the readings are wrapped in. */
function rows(): string[] {
  return screen.queryAllByRole('listitem').map((row) => row.textContent ?? '');
}

function connectionLabel(): string {
  return screen.getByRole('status').textContent ?? '';
}

async function mount() {
  const view = render(<Dashboard />);
  // A connection opens on a microtask here, the way a real one opens on I/O.
  await act(async () => {});
  expect(stream.current(), 'the dashboard never opened a stream').toBeDefined();
  return view;
}

describe('the dashboard notices the drop and lets the stream go', () => {
  it('paints each reading as it arrives', async () => {
    await mount();

    await act(async () => stream.send(reading(1, 'web-1', 41)));
    expect(rows().some((row) => row.includes('web-1'))).toBe(true);

    await act(async () => stream.send(reading(2, 'db-1', 12)));
    expect(rows().length, 'the second reading never landed').toBe(2);
  });

  it('says when the connection has dropped', async () => {
    await mount();
    const connected = connectionLabel();

    await act(async () => stream.drop());

    expect(
      connectionLabel(),
      'the page looks the same whether the stream is live or gone'
    ).not.toBe(connected);
  });

  it('keeps the numbers it already has when the connection drops', async () => {
    await mount();
    await act(async () => stream.send(reading(1, 'web-1', 41)));
    expect(rows().length).toBe(1);

    await act(async () => stream.drop());

    expect(rows().length, 'the readings were thrown away along with the connection').toBe(1);
  });

  it('goes back to normal on the connection it gets for free', async () => {
    await mount();
    const connected = connectionLabel();
    await act(async () => stream.send(reading(1, 'web-1', 41)));

    await act(async () => stream.drop());
    expect(connectionLabel()).not.toBe(connected);

    await act(async () => stream.restore());

    expect(connectionLabel(), 'the stream came back and the page is still saying it has not').toBe(
      connected
    );
    expect(
      stream.current()?.lastEventId,
      'the reconnection resumes from the last id seen, so a hand-rolled one loses the gap'
    ).toBe('1');
  });

  it('closes the stream when the dashboard goes away', async () => {
    const view = await mount();
    const opened = stream.current();

    view.unmount();

    expect(opened?.state, 'the connection outlived the component that opened it').toBe('closed');
    expect(stream.current(), 'something is still holding a stream open').toBeUndefined();
  });
});
