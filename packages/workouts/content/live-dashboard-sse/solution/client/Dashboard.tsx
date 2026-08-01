import { useEffect, useState } from 'react';

import { EventSource } from './event-source';

export interface Reading {
  id: number;
  host: string;
  cpu: number;
}

export interface DashboardProps {
  /** Where the event stream lives. */
  url?: string;
}

type Connection = 'connecting' | 'live' | 'reconnecting';

const LABELS: Record<Connection, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
};

export function Dashboard({ url = '/events' }: DashboardProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [connection, setConnection] = useState<Connection>('connecting');

  useEffect(() => {
    const source = new EventSource(url);

    source.onopen = () => setConnection('live');

    source.onmessage = (event) => {
      const reading = JSON.parse(event.data as string) as Reading;
      setReadings((current) => [...current, reading]);
    };

    // EventSource reconnects by itself, and it sends the last id it saw when it
    // does, so this is a label rather than a retry loop. Clearing the readings
    // here would be worse than useless: numbers with a warning on them beat an
    // empty page.
    source.onerror = () => setConnection('reconnecting');

    // Without this the connection outlives the component, and the next mount
    // opens a second one next to the one nobody is reading.
    return () => source.close();
  }, [url]);

  return (
    <section className="dashboard">
      <h1>Fleet</h1>
      <p role="status">{LABELS[connection]}</p>
      <ul>
        {readings.map((reading) => (
          <li key={reading.id}>
            {reading.host}: {reading.cpu}%
          </li>
        ))}
      </ul>
    </section>
  );
}
