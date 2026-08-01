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

/**
 * The live view of the fleet.
 *
 * It opens the stream and paints what arrives, which is most of the job on a
 * good day. On a bad one the connection outlives the component, a remount opens
 * a second one alongside the first, and a stream that has dropped looks exactly
 * like a fleet that has gone quiet.
 *
 * TODO: close the stream when the component goes away, and say when the
 * connection has dropped. See brief.md.
 */
export function Dashboard({ url = '/events' }: DashboardProps) {
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event) => {
      const reading = JSON.parse(event.data as string) as Reading;
      setReadings((current) => [...current, reading]);
    };
  }, [url]);

  return (
    <section className="dashboard">
      <h1>Fleet</h1>
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
