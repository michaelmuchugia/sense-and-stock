import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  bigint,
  date,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// STOCKS

export const stocks = pgTable('stocks', {
  id:         serial('id').primaryKey(),
  ticker:     varchar('ticker', { length: 10 }).unique().notNull(),
  name:       varchar('name', { length: 255 }).notNull(),
  sector:     varchar('sector', { length: 100 }),
  profile:    text('profile'),
  isActive:   boolean('is_active').default(true).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  activeIdx: index('stocks_active_idx').on(t.isActive),
  sectorIdx: index('stocks_sector_idx').on(t.sector),
}))

// STOCK PRICES

export const stockPrices = pgTable('stock_prices', {
  id:         serial('id').primaryKey(),
  stockId:    integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  date:       date('date').notNull(),
  open:       decimal('open', { precision: 12, scale: 4 }),
  high:       decimal('high', { precision: 12, scale: 4 }),
  low:        decimal('low', { precision: 12, scale: 4 }),
  close:      decimal('close', { precision: 12, scale: 4 }).notNull(),
  volume:     bigint('volume', { mode: 'number' }),
  changePct:  decimal('change_pct', { precision: 8, scale: 4 }),
  high52w:    decimal('high_52w', { precision: 12, scale: 4 }),
  low52w:     decimal('low_52w', { precision: 12, scale: 4 }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  stockDateUnique: unique('stock_prices_stock_date_unique').on(t.stockId, t.date),
  stockDateIdx:    index('stock_prices_stock_date_idx').on(t.stockId, t.date),
}))

// ANALYSTS

export const analysts = pgTable('analysts', {
  id:         serial('id').primaryKey(),
  externalId: integer('external_id').unique(),
  name:       varchar('name', { length: 255 }).notNull(),
  initials:   varchar('initials', { length: 10 }),
  firm:       varchar('firm', { length: 255 }),
  sinceYear:  integer('since_year'),
  hitRatio:   decimal('hit_ratio', { precision: 8, scale: 4 }),
  avgReturn:  decimal('avg_return', { precision: 8, scale: 4 }),
  avgDays:    integer('avg_days'),
  perfScore:  decimal('perf_score', { precision: 8, scale: 4 }),
  totalTargets: integer('total_targets').default(0).notNull(),
  bio:        text('bio'),
  isActive:   boolean('is_active').default(true).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  firmIdx: index('analysts_firm_idx').on(t.firm),
}))

// ANALYST TARGETS

export const analystTargets = pgTable('analyst_targets', {
  id:           serial('id').primaryKey(),
  analystId:    integer('analyst_id').references(() => analysts.id, { onDelete: 'cascade' }).notNull(),
  stockId:      integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  targetPrice:  decimal('target_price', { precision: 12, scale: 4 }).notNull(),
  rating:       varchar('rating', { length: 20 }),
  issuedDate:   date('issued_date').notNull(),
  reportSource: varchar('report_source', { length: 255 }),
  notes:        text('notes'),
  isCurrent:    boolean('is_current').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  stockCurrentIdx: index('analyst_targets_stock_current_idx').on(t.stockId, t.isCurrent),
  analystIdx:      index('analyst_targets_analyst_idx').on(t.analystId),
}))

// ANALYST COVERAGE (junction with cached perf data)

export const analystCoverage = pgTable('analyst_coverage', {
  id:         serial('id').primaryKey(),
  analystId:  integer('analyst_id').references(() => analysts.id, { onDelete: 'cascade' }).notNull(),
  stockId:    integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  hitRatio:   decimal('hit_ratio', { precision: 8, scale: 4 }),
  avgReturn:  decimal('avg_return', { precision: 8, scale: 4 }),
  avgDays:    integer('avg_days'),
  totalCalls: integer('total_calls').default(0).notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  analystStockUnique: unique('analyst_coverage_analyst_stock_unique').on(t.analystId, t.stockId),
  stockIdx:           index('analyst_coverage_stock_idx').on(t.stockId),
}))

// STOCK SCORES (one current AQ score per stock)

export const stockScores = pgTable('stock_scores', {
  id:                 serial('id').primaryKey(),
  stockId:            integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull().unique(),
  score:              integer('score').notNull(),
  signal:             varchar('signal', { length: 50 }),
  sigClass:           varchar('sig_class', { length: 10 }),
  confidence:         varchar('confidence', { length: 10 }),
  upsidePct:          decimal('upside_pct', { precision: 8, scale: 4 }),
  pillarConfidence:   integer('pillar_confidence'),
  pillarAccuracy:     integer('pillar_accuracy'),
  pillarUpside:       integer('pillar_upside'),
  pillarMomentum:     integer('pillar_momentum'),
  calculatedAt:       timestamp('calculated_at').defaultNow().notNull(),
}, (t) => ({
  sigClassIdx: index('stock_scores_sig_class_idx').on(t.sigClass),
}))

// SIGNAL SNAPSHOTS

export const signalSnapshots = pgTable('signal_snapshots', {
  id:         serial('id').primaryKey(),
  month:      varchar('month', { length: 7 }).notNull().unique(),
  label:      varchar('label', { length: 20 }).notNull(),
  naseRet:    decimal('nase_ret', { precision: 8, scale: 4 }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
})

export const signalSnapshotEntries = pgTable('signal_snapshot_entries', {
  id:             serial('id').primaryKey(),
  snapshotId:     integer('snapshot_id').references(() => signalSnapshots.id, { onDelete: 'cascade' }).notNull(),
  stockId:        integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  entryPrice:     decimal('entry_price', { precision: 12, scale: 4 }).notNull(),
  scoreAtSignal:  integer('score_at_signal'),
  note:           text('note'),
  rank:           integer('rank'),
}, (t) => ({
  snapStockUnique: unique('signal_snapshot_entries_snap_stock_unique').on(t.snapshotId, t.stockId),
  snapIdx:         index('signal_snapshot_entries_snap_idx').on(t.snapshotId),
}))

// WATCHLIST (Phase 4 will populate userId via auth)

export const watchlistItems = pgTable('watchlist_items', {
  id:         serial('id').primaryKey(),
  userId:     varchar('user_id', { length: 255 })
                .references(() => users.clerkUserId, { onDelete: 'cascade' })
                .notNull(),
  stockId:    integer('stock_id').references(() => stocks.id, { onDelete: 'cascade' }).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userStockUnique: unique('watchlist_items_user_stock_unique').on(t.userId, t.stockId),
  userIdx:         index('watchlist_items_user_idx').on(t.userId),
}))

// USERS — mirror of Clerk identities. Clerk owns auth; this row carries
// app-level profile + is the FK target for watchlist and activity.

export const users = pgTable('users', {
  clerkUserId: varchar('clerk_user_id', { length: 255 }).primaryKey(),
  email:       varchar('email', { length: 255 }).notNull(),
  name:        varchar('name', { length: 255 }),
  imageUrl:    text('image_url'),
  phone:       varchar('phone', { length: 30 }),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  deletedAt:   timestamp('deleted_at'),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
}))

// USER ACTIVITY LOG — audit trail of sensitive actions, per user.

export const userActivityLog = pgTable('user_activity_log', {
  id:        serial('id').primaryKey(),
  userId:    varchar('user_id', { length: 255 })
               .references(() => users.clerkUserId, { onDelete: 'cascade' })
               .notNull(),
  action:    varchar('action', { length: 50 }).notNull(),
  detail:    text('detail'),
  ip:        varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userTimeIdx: index('activity_user_time_idx').on(t.userId, t.createdAt),
}))

// INGESTION LOG

export const ingestionLog = pgTable('ingestion_log', {
  id:             serial('id').primaryKey(),
  runAt:          timestamp('run_at').defaultNow().notNull(),
  source:         varchar('source', { length: 100 }).notNull(),
  stocksUpdated:  integer('stocks_updated').default(0).notNull(),
  status:         varchar('status', { length: 20 }).notNull(),
  errorMessage:   text('error_message'),
  durationMs:     integer('duration_ms'),
}, (t) => ({
  runAtIdx: index('ingestion_log_run_at_idx').on(t.runAt),
}))

// SUBSCRIPTIONS — one row per user holding their current plan + expiry.

export const subscriptions = pgTable('subscriptions', {
  id:         serial('id').primaryKey(),
  userId:     varchar('user_id', { length: 255 })
                .references(() => users.clerkUserId, { onDelete: 'cascade' })
                .notNull().unique(),
  plan:       varchar('plan', { length: 20 }).default('free').notNull(),      // 'free' | 'plus'
  status:     varchar('status', { length: 20 }).default('inactive').notNull(), // 'inactive' | 'active' | 'expired'
  startedAt:  timestamp('started_at'),
  expiresAt:  timestamp('expires_at'),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('subscriptions_status_idx').on(t.status),
}))

// M-PESA PAYMENTS — one row per STK push attempt; the callback resolves it.

export const mpesaPayments = pgTable('mpesa_payments', {
  id:                serial('id').primaryKey(),
  userId:            varchar('user_id', { length: 255 })
                       .references(() => users.clerkUserId, { onDelete: 'cascade' })
                       .notNull(),
  checkoutRequestId: varchar('checkout_request_id', { length: 120 }).unique(),
  merchantRequestId: varchar('merchant_request_id', { length: 120 }),
  phone:             varchar('phone', { length: 20 }).notNull(),
  amount:            integer('amount').notNull(),
  plan:              varchar('plan', { length: 20 }).default('plus').notNull(),
  status:            varchar('status', { length: 20 }).default('pending').notNull(), // pending|success|failed|cancelled
  mpesaReceipt:      varchar('mpesa_receipt', { length: 40 }),
  resultCode:        integer('result_code'),
  resultDesc:        text('result_desc'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userIdx:     index('mpesa_payments_user_idx').on(t.userId),
  checkoutIdx: index('mpesa_payments_checkout_idx').on(t.checkoutRequestId),
}))

// RELATIONS

export const stocksRelations = relations(stocks, ({ many }) => ({
  prices:     many(stockPrices),
  targets:    many(analystTargets),
  coverage:   many(analystCoverage),
  score:      many(stockScores),
  watchlist:  many(watchlistItems),
  signals:    many(signalSnapshotEntries),
}))

export const analystsRelations = relations(analysts, ({ many }) => ({
  targets:    many(analystTargets),
  coverage:   many(analystCoverage),
}))

export const stockPricesRelations = relations(stockPrices, ({ one }) => ({
  stock: one(stocks, {
    fields: [stockPrices.stockId],
    references: [stocks.id],
  }),
}))

export const analystTargetsRelations = relations(analystTargets, ({ one }) => ({
  analyst: one(analysts, {
    fields: [analystTargets.analystId],
    references: [analysts.id],
  }),
  stock: one(stocks, {
    fields: [analystTargets.stockId],
    references: [stocks.id],
  }),
}))

export const analystCoverageRelations = relations(analystCoverage, ({ one }) => ({
  analyst: one(analysts, {
    fields: [analystCoverage.analystId],
    references: [analysts.id],
  }),
  stock: one(stocks, {
    fields: [analystCoverage.stockId],
    references: [stocks.id],
  }),
}))

export const stockScoresRelations = relations(stockScores, ({ one }) => ({
  stock: one(stocks, {
    fields: [stockScores.stockId],
    references: [stocks.id],
  }),
}))

export const signalSnapshotsRelations = relations(signalSnapshots, ({ many }) => ({
  entries: many(signalSnapshotEntries),
}))

export const usersRelations = relations(users, ({ many }) => ({
  watchlist: many(watchlistItems),
  activity:  many(userActivityLog),
}))

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  user:  one(users, {
    fields: [watchlistItems.userId],
    references: [users.clerkUserId],
  }),
  stock: one(stocks, {
    fields: [watchlistItems.stockId],
    references: [stocks.id],
  }),
}))

export const userActivityLogRelations = relations(userActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLog.userId],
    references: [users.clerkUserId],
  }),
}))

export const signalSnapshotEntriesRelations = relations(signalSnapshotEntries, ({ one }) => ({
  snapshot: one(signalSnapshots, {
    fields: [signalSnapshotEntries.snapshotId],
    references: [signalSnapshots.id],
  }),
  stock: one(stocks, {
    fields: [signalSnapshotEntries.stockId],
    references: [stocks.id],
  }),
}))
