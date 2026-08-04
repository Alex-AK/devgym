/** A row of the alerts table, exactly as SQLite hands it back. */
export interface AlertRow {
  id: number;
  service: string;
  message: string;
  status: string;
  created_at: string;
}

/** One alert as the feed hands it to the client. */
export interface FeedAlert {
  id: number;
  service: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface FeedQuery {
  status?: string;
  limit?: number;
  /** Whatever the previous page handed back, or nothing for the first page. */
  cursor?: string | null;
}

export interface FeedPage {
  items: FeedAlert[];
  /**
   * Opaque to the client: it holds this and hands it back to ask for more.
   * Null once there is nothing after the page just returned.
   */
  nextCursor: string | null;
}
