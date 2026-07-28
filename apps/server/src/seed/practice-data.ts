/**
 * The bookstore dataset behind every SQL problem. Fully deterministic literals —
 * no randomness — so problems stay well-posed and debugging stays sane.
 *
 * Invariants the seed problems depend on (asserted in practice-data.spec.ts):
 *  - 4 genres, exactly one named `Fantasy`, holding 5 books.
 *  - 10 books published after 2015; every book price is distinct.
 *  - Customers 9 and 10 have zero completed orders (9 has cancelled ones only,
 *    10 has none at all) — the LEFT JOIN trap in P3.
 *  - 5 cancelled orders, all but none of them carrying order_items, so filtering
 *    on status visibly changes P4's revenue totals and their ordering.
 *  - Completed revenue per genre is distinct: Fantasy > Mystery > History > Science.
 *
 * Three further tables exist for the harder analytics problems:
 *  - `employees` — a self-referencing manager_id (NULL for the CEO), distinct salaries.
 *  - `reviews` — every book's average rating is distinct; books 5, 11 and 15 have none;
 *    ten comments are NULL.
 *  - `inventory` — one row per book EXCEPT books 13-15, three rows with stock 0 and three
 *    with a NULL restocked_at, so COALESCE / IS NULL / LEFT JOIN all have teeth.
 */

export interface AuthorSeed {
  id: number;
  name: string;
  country: string;
}

export interface BookSeed {
  id: number;
  title: string;
  authorId: number;
  genre: string;
  price: number;
  publishedYear: number;
}

export interface CustomerSeed {
  id: number;
  name: string;
  email: string;
  city: string;
  joinedAt: string;
}

export interface OrderSeed {
  id: number;
  customerId: number;
  orderedAt: string;
  status: 'completed' | 'cancelled';
}

export interface OrderItemSeed {
  id: number;
  orderId: number;
  bookId: number;
  quantity: number;
  unitPrice: number;
}

export const authors: AuthorSeed[] = [
  { id: 1, name: 'Ursula Vane', country: 'United Kingdom' },
  { id: 2, name: 'Marco Ferretti', country: 'Italy' },
  { id: 3, name: 'Aisha Rahman', country: 'Bangladesh' },
  { id: 4, name: 'Nils Berg', country: 'Sweden' },
  { id: 5, name: 'Clara Nunes', country: 'Brazil' },
  { id: 6, name: 'Tomas Ruiz', country: 'Spain' },
  { id: 7, name: 'Hana Kimura', country: 'Japan' },
  { id: 8, name: 'Peter Osei', country: 'Ghana' },
];

export const books: BookSeed[] = [
  {
    id: 1,
    title: 'The Glass Kingdom',
    authorId: 1,
    genre: 'Fantasy',
    price: 18.99,
    publishedYear: 2018,
  },
  { id: 2, title: 'Emberfall', authorId: 1, genre: 'Fantasy', price: 22.5, publishedYear: 2016 },
  {
    id: 3,
    title: 'The Last Cartographer',
    authorId: 4,
    genre: 'Fantasy',
    price: 15.75,
    publishedYear: 2014,
  },
  {
    id: 4,
    title: 'Songs of the Hollow',
    authorId: 5,
    genre: 'Fantasy',
    price: 27.0,
    publishedYear: 2019,
  },
  { id: 5, title: 'Winterlight', authorId: 7, genre: 'Fantasy', price: 12.25, publishedYear: 2021 },
  {
    id: 6,
    title: 'A Quiet Alibi',
    authorId: 2,
    genre: 'Mystery',
    price: 14.5,
    publishedYear: 2017,
  },
  {
    id: 7,
    title: 'The Harbour Murders',
    authorId: 2,
    genre: 'Mystery',
    price: 9.99,
    publishedYear: 2013,
  },
  { id: 8, title: 'Cold Type', authorId: 6, genre: 'Mystery', price: 19.25, publishedYear: 2020 },
  {
    id: 9,
    title: 'Nine Grams of Doubt',
    authorId: 3,
    genre: 'Mystery',
    price: 24.75,
    publishedYear: 2016,
  },
  {
    id: 10,
    title: 'The Restless Atom',
    authorId: 3,
    genre: 'Science',
    price: 31.0,
    publishedYear: 2018,
  },
  {
    id: 11,
    title: 'Signals in the Noise',
    authorId: 8,
    genre: 'Science',
    price: 16.4,
    publishedYear: 2012,
  },
  { id: 12, title: 'Deep Time', authorId: 4, genre: 'Science', price: 28.6, publishedYear: 2022 },
  {
    id: 13,
    title: 'Empires of Salt',
    authorId: 6,
    genre: 'History',
    price: 34.1,
    publishedYear: 2015,
  },
  {
    id: 14,
    title: 'The Paper Road',
    authorId: 7,
    genre: 'History',
    price: 21.3,
    publishedYear: 2017,
  },
  { id: 15, title: 'Marginalia', authorId: 8, genre: 'History', price: 11.8, publishedYear: 2011 },
];

export const customers: CustomerSeed[] = [
  {
    id: 1,
    name: 'Dana Whitfield',
    email: 'dana@example.com',
    city: 'Bristol',
    joinedAt: '2022-03-11',
  },
  { id: 2, name: 'Omar Haddad', email: 'omar@example.com', city: 'Lyon', joinedAt: '2022-05-02' },
  { id: 3, name: 'Priya Nair', email: 'priya@example.com', city: 'Leeds', joinedAt: '2022-06-18' },
  {
    id: 4,
    name: 'Jonas Meyer',
    email: 'jonas@example.com',
    city: 'Hamburg',
    joinedAt: '2022-08-09',
  },
  {
    id: 5,
    name: 'Lena Fischer',
    email: 'lena@example.com',
    city: 'Vienna',
    joinedAt: '2022-09-27',
  },
  { id: 6, name: 'Ruth Adeyemi', email: 'ruth@example.com', city: 'Accra', joinedAt: '2023-01-14' },
  { id: 7, name: 'Sam Okafor', email: 'sam@example.com', city: 'Bristol', joinedAt: '2023-02-05' },
  { id: 8, name: 'Ines Duarte', email: 'ines@example.com', city: 'Porto', joinedAt: '2023-04-21' },
  { id: 9, name: 'Kai Lindqvist', email: 'kai@example.com', city: 'Malmo', joinedAt: '2023-07-30' },
  {
    id: 10,
    name: 'Mira Sokolova',
    email: 'mira@example.com',
    city: 'Prague',
    joinedAt: '2023-10-12',
  },
];

export const orders: OrderSeed[] = [
  { id: 1, customerId: 1, orderedAt: '2023-01-05', status: 'completed' },
  { id: 2, customerId: 1, orderedAt: '2023-02-11', status: 'completed' },
  { id: 3, customerId: 2, orderedAt: '2023-02-14', status: 'completed' },
  { id: 4, customerId: 3, orderedAt: '2023-03-02', status: 'completed' },
  { id: 5, customerId: 3, orderedAt: '2023-03-19', status: 'cancelled' },
  { id: 6, customerId: 4, orderedAt: '2023-04-01', status: 'completed' },
  { id: 7, customerId: 5, orderedAt: '2023-04-15', status: 'completed' },
  { id: 8, customerId: 2, orderedAt: '2023-05-06', status: 'cancelled' },
  { id: 9, customerId: 6, orderedAt: '2023-05-22', status: 'completed' },
  { id: 10, customerId: 7, orderedAt: '2023-06-03', status: 'completed' },
  { id: 11, customerId: 1, orderedAt: '2023-06-18', status: 'completed' },
  { id: 12, customerId: 8, orderedAt: '2023-07-01', status: 'completed' },
  { id: 13, customerId: 9, orderedAt: '2023-07-14', status: 'cancelled' },
  { id: 14, customerId: 4, orderedAt: '2023-08-02', status: 'completed' },
  { id: 15, customerId: 5, orderedAt: '2023-08-20', status: 'cancelled' },
  { id: 16, customerId: 6, orderedAt: '2023-09-09', status: 'completed' },
  { id: 17, customerId: 9, orderedAt: '2023-09-25', status: 'cancelled' },
  { id: 18, customerId: 7, orderedAt: '2023-10-10', status: 'completed' },
  { id: 19, customerId: 8, orderedAt: '2023-11-02', status: 'completed' },
  { id: 20, customerId: 3, orderedAt: '2023-11-28', status: 'completed' },
];

const priceOf = (bookId: number): number => {
  const book = books.find((entry) => entry.id === bookId);
  if (!book) throw new Error(`practice-data: no book with id ${bookId}`);
  return book.price;
};

const item = (id: number, orderId: number, bookId: number, quantity: number): OrderItemSeed => ({
  id,
  orderId,
  bookId,
  quantity,
  unitPrice: priceOf(bookId),
});

export const orderItems: OrderItemSeed[] = [
  // Completed orders.
  item(1, 1, 1, 1),
  item(2, 1, 6, 1),
  item(3, 2, 2, 2),
  item(4, 2, 10, 1),
  item(5, 3, 4, 1),
  item(6, 3, 13, 1),
  item(7, 3, 7, 3),
  item(8, 4, 5, 2),
  item(9, 4, 9, 1),
  item(10, 6, 1, 3),
  item(11, 7, 12, 1),
  item(12, 7, 14, 2),
  item(13, 9, 3, 1),
  item(14, 9, 8, 2),
  item(15, 10, 2, 1),
  item(16, 10, 11, 1),
  item(17, 10, 15, 4),
  item(18, 11, 4, 2),
  item(19, 11, 7, 1),
  item(20, 12, 6, 2),
  item(21, 12, 10, 1),
  item(22, 12, 5, 1),
  item(23, 14, 9, 2),
  item(24, 14, 13, 1),
  item(25, 16, 7, 1),
  item(26, 16, 12, 2),
  item(27, 18, 1, 1),
  item(28, 18, 14, 1),
  item(29, 19, 3, 2),
  item(30, 19, 8, 1),
  item(31, 20, 15, 2),
  item(32, 20, 11, 2),
  // Cancelled orders — big enough to reorder the genre revenue table if you
  // forget to filter them out.
  item(33, 5, 1, 5),
  item(34, 5, 4, 3),
  item(35, 8, 10, 4),
  item(36, 13, 6, 10),
  item(37, 13, 7, 2),
  item(38, 15, 13, 3),
  item(39, 17, 12, 6),
  item(40, 17, 2, 4),
];

export interface EmployeeSeed {
  id: number;
  name: string;
  role: string;
  managerId: number | null;
  hiredAt: string;
  salary: number;
  city: string;
}

export interface ReviewSeed {
  id: number;
  bookId: number;
  customerId: number;
  rating: number;
  createdAt: string;
  comment: string | null;
}

export interface InventorySeed {
  bookId: number;
  stock: number;
  restockedAt: string | null;
}

/** Self-referencing hierarchy: employee 1 is the only one with a NULL manager. */
export const employees: EmployeeSeed[] = [
  {
    id: 1,
    name: 'Ada Reyes',
    role: 'CEO',
    managerId: null,
    hiredAt: '2018-01-15',
    salary: 210000,
    city: 'Bristol',
  },
  {
    id: 2,
    name: 'Ben Okonkwo',
    role: 'Engineering Manager',
    managerId: 1,
    hiredAt: '2019-03-04',
    salary: 165000,
    city: 'Bristol',
  },
  {
    id: 3,
    name: 'Cara Lindt',
    role: 'Sales Manager',
    managerId: 1,
    hiredAt: '2019-06-20',
    salary: 158000,
    city: 'Lyon',
  },
  {
    id: 4,
    name: 'Dev Sharma',
    role: 'Engineer',
    managerId: 2,
    hiredAt: '2020-02-10',
    salary: 132000,
    city: 'Bristol',
  },
  {
    id: 5,
    name: 'Elin Haugen',
    role: 'Engineer',
    managerId: 2,
    hiredAt: '2020-09-01',
    salary: 128000,
    city: 'Malmo',
  },
  {
    id: 6,
    name: 'Femi Balogun',
    role: 'Engineer',
    managerId: 2,
    hiredAt: '2021-05-17',
    salary: 121000,
    city: 'Accra',
  },
  {
    id: 7,
    name: 'Gita Roy',
    role: 'Designer',
    managerId: 2,
    hiredAt: '2021-11-08',
    salary: 118000,
    city: 'Leeds',
  },
  {
    id: 8,
    name: 'Hugo Marchand',
    role: 'Sales Rep',
    managerId: 3,
    hiredAt: '2020-04-22',
    salary: 95000,
    city: 'Lyon',
  },
  {
    id: 9,
    name: 'Iris Novak',
    role: 'Sales Rep',
    managerId: 3,
    hiredAt: '2022-01-30',
    salary: 91000,
    city: 'Prague',
  },
  {
    id: 10,
    name: 'Jonas Weiss',
    role: 'Sales Rep',
    managerId: 3,
    hiredAt: '2022-07-12',
    salary: 88000,
    city: 'Hamburg',
  },
  {
    id: 11,
    name: 'Kira Sato',
    role: 'Support',
    managerId: 3,
    hiredAt: '2023-02-14',
    salary: 76000,
    city: 'Tokyo',
  },
  {
    id: 12,
    name: 'Liam Doyle',
    role: 'Engineer',
    managerId: 2,
    hiredAt: '2023-08-05',
    salary: 112000,
    city: 'Dublin',
  },
];

/** Averages per book are all distinct; books 5, 11 and 15 deliberately have none. */
export const reviews: ReviewSeed[] = [
  {
    id: 1,
    bookId: 1,
    customerId: 1,
    rating: 5,
    createdAt: '2023-02-01',
    comment: 'Gorgeous world-building',
  },
  { id: 2, bookId: 1, customerId: 3, rating: 4, createdAt: '2023-03-14', comment: null },
  { id: 3, bookId: 1, customerId: 7, rating: 5, createdAt: '2023-05-02', comment: 'Read it twice' },
  { id: 4, bookId: 1, customerId: 10, rating: 3, createdAt: '2024-02-15', comment: null },
  { id: 5, bookId: 2, customerId: 2, rating: 3, createdAt: '2023-01-22', comment: 'Slow start' },
  { id: 6, bookId: 2, customerId: 4, rating: 4, createdAt: '2023-04-11', comment: null },
  { id: 7, bookId: 3, customerId: 6, rating: 2, createdAt: '2023-02-18', comment: 'Not for me' },
  { id: 8, bookId: 3, customerId: 8, rating: 3, createdAt: '2023-06-05', comment: 'Fine' },
  {
    id: 9,
    bookId: 4,
    customerId: 1,
    rating: 5,
    createdAt: '2023-03-30',
    comment: 'Best of the year',
  },
  { id: 10, bookId: 4, customerId: 5, rating: 5, createdAt: '2023-07-19', comment: null },
  { id: 11, bookId: 4, customerId: 9, rating: 4, createdAt: '2023-09-02', comment: 'Great prose' },
  {
    id: 12,
    bookId: 6,
    customerId: 2,
    rating: 4,
    createdAt: '2023-01-09',
    comment: 'Tidy plotting',
  },
  { id: 13, bookId: 6, customerId: 10, rating: 3, createdAt: '2023-08-21', comment: null },
  { id: 14, bookId: 6, customerId: 8, rating: 5, createdAt: '2024-01-08', comment: 'Reread' },
  { id: 15, bookId: 7, customerId: 3, rating: 2, createdAt: '2023-02-27', comment: 'Dated' },
  { id: 16, bookId: 8, customerId: 4, rating: 5, createdAt: '2023-05-16', comment: 'Sharp' },
  { id: 17, bookId: 8, customerId: 6, rating: 4, createdAt: '2023-10-01', comment: null },
  { id: 18, bookId: 8, customerId: 7, rating: 4, createdAt: '2023-11-11', comment: 'Solid' },
  { id: 19, bookId: 9, customerId: 5, rating: 3, createdAt: '2023-03-08', comment: 'Middling' },
  {
    id: 20,
    bookId: 9,
    customerId: 8,
    rating: 3,
    createdAt: '2023-06-24',
    comment: 'Fine but thin',
  },
  {
    id: 21,
    bookId: 10,
    customerId: 1,
    rating: 5,
    createdAt: '2023-04-03',
    comment: 'Clear and rigorous',
  },
  { id: 22, bookId: 10, customerId: 9, rating: 4, createdAt: '2023-08-14', comment: null },
  {
    id: 23,
    bookId: 12,
    customerId: 2,
    rating: 5,
    createdAt: '2023-05-29',
    comment: 'Beautifully argued',
  },
  {
    id: 24,
    bookId: 12,
    customerId: 10,
    rating: 4,
    createdAt: '2023-09-18',
    comment: 'Dense but worth it',
  },
  { id: 25, bookId: 12, customerId: 3, rating: 2, createdAt: '2023-12-02', comment: null },
  {
    id: 26,
    bookId: 13,
    customerId: 4,
    rating: 2,
    createdAt: '2023-02-11',
    comment: 'Sweeping but dry',
  },
  { id: 27, bookId: 13, customerId: 6, rating: 2, createdAt: '2023-07-07', comment: 'Repetitive' },
  { id: 28, bookId: 13, customerId: 9, rating: 3, createdAt: '2023-11-03', comment: null },
  { id: 29, bookId: 14, customerId: 5, rating: 5, createdAt: '2023-03-21', comment: 'Wonderful' },
  { id: 30, bookId: 14, customerId: 7, rating: 3, createdAt: '2023-10-19', comment: null },
  { id: 31, bookId: 14, customerId: 9, rating: 4, createdAt: '2023-11-27', comment: 'Good' },
  { id: 32, bookId: 14, customerId: 2, rating: 3, createdAt: '2024-01-19', comment: 'Uneven' },
];

/** Books 13-15 have no row at all — that is the LEFT JOIN / COALESCE trap. */
export const inventory: InventorySeed[] = [
  { bookId: 1, stock: 12, restockedAt: '2024-01-10' },
  { bookId: 2, stock: 0, restockedAt: '2023-11-02' },
  { bookId: 3, stock: 5, restockedAt: null },
  { bookId: 4, stock: 22, restockedAt: '2024-02-01' },
  { bookId: 5, stock: 0, restockedAt: null },
  { bookId: 6, stock: 8, restockedAt: '2023-12-15' },
  { bookId: 7, stock: 31, restockedAt: '2024-01-22' },
  { bookId: 8, stock: 3, restockedAt: '2024-02-14' },
  { bookId: 9, stock: 0, restockedAt: '2023-10-30' },
  { bookId: 10, stock: 17, restockedAt: '2024-01-05' },
  { bookId: 11, stock: 9, restockedAt: null },
  { bookId: 12, stock: 41, restockedAt: '2024-02-20' },
];
