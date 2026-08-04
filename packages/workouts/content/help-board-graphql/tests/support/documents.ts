/** The board screen: threads, the replies on each, and who wrote them. */
export const BOARD_SCREEN = `
  query Board($first: Int!) {
    threads(first: $first) {
      id
      title
      posts {
        id
        body
        author {
          id
          name
        }
      }
    }
  }
`;

/** The same screen, with the team badge shown against each reply. */
export const BOARD_SCREEN_WITH_TEAMS = `
  query BoardWithTeams($first: Int!) {
    threads(first: $first) {
      id
      title
      posts {
        id
        body
        author {
          id
          name
          team {
            id
            name
          }
        }
      }
    }
  }
`;

export interface ScreenAuthor {
  id: string;
  name: string;
  team?: { id: string; name: string } | null;
}

export interface ScreenPost {
  id: string;
  body: string;
  author: ScreenAuthor | null;
}

export interface ScreenThread {
  id: string;
  title: string;
  posts: ScreenPost[];
}

export function threadsOf(data: Record<string, unknown>): ScreenThread[] {
  return data.threads as ScreenThread[];
}
